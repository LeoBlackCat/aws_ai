const fs = require('fs');
const dbConnection = require('./db/connection');
const { Definition } = require('./db/models');
const { encoding_for_model } = require('tiktoken');

require('dotenv').config();

const encoder = encoding_for_model('gpt-5-mini');

class MissingConceptsExtractor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.totalTokensUsed = 0;
    this.successfulExtractions = 0;
    this.failedExtractions = 0;
    this.retries = 0;
  }

  async getMissingConcepts() {
    await dbConnection.connect();
    
    // Get all expected concepts from JSON
    const conceptsData = JSON.parse(fs.readFileSync('all_extracted_concepts.json', 'utf8'));
    const fundamentalsSections = conceptsData.results.filter(section => 
      section.file === 'data/fundamentals/fundamentals.md'
    );

    // Get existing concepts from MongoDB
    const existingConcepts = await Definition.find({ 'source.file': 'data/fundamentals/fundamentals.md' })
      .select('concept source.section')
      .lean();

    const existingConceptNames = new Set(existingConcepts.map(d => d.concept));

    console.log('📊 Analysis:');
    console.log(`Expected total: ${fundamentalsSections.reduce((sum, s) => sum + s.concept_count, 0)}`);
    console.log(`Already have: ${existingConceptNames.size}`);

    // Find missing concepts by section
    const missingSections = [];
    
    for (const section of fundamentalsSections) {
      const missingConcepts = section.concepts.filter(concept => !existingConceptNames.has(concept));
      
      if (missingConcepts.length > 0) {
        missingSections.push({
          section: section.section,
          concepts: missingConcepts,
          count: missingConcepts.length
        });
        console.log(`📁 ${section.section}: ${missingConcepts.length} missing concepts`);
        console.log(`   Missing: ${missingConcepts.join(', ')}`);
      }
    }

    return missingSections;
  }

  countTokens(text) {
    return encoder.encode(text).length;
  }

  findDefinitionSection(concept, markdownContent, sectionName) {
    const lines = markdownContent.split('\n');
    
    // Find the header1 section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.match(/^#\s+/) && line.toLowerCase().includes(sectionName.toLowerCase())) {
        let sectionContent = [line];
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.match(/^#\s+/)) {
            break;
          }
          sectionContent.push(nextLine);
        }
        
        return sectionContent.join('\n').trim();
      }
    }
    
    // Fallback: search for concept in the whole document
    return markdownContent;
  }

  createPrompt(concept, relevantSection) {
    return `Extract the exact definition for "${concept}" from this AWS AI course content.

RULES:
- Return ONLY the exact text from the source material
- Do NOT rephrase, summarize, or add explanations
- If no clear definition exists, return "DEFINITION_NOT_FOUND"

CONCEPT: "${concept}"

CONTENT:
${relevantSection}

Definition:`;
  }

  async extractDefinition(concept, markdownContent, sectionName, retry = false) {
    const relevantSection = this.findDefinitionSection(concept, markdownContent, sectionName);
    const prompt = this.createPrompt(concept, relevantSection);
    const promptTokens = this.countTokens(prompt);

    const retryText = retry ? ' (RETRY)' : '';
    console.log(`🔄 Extracting: "${concept}"${retryText}`);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 400
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const definition = data.choices[0]?.message?.content?.trim() || '';
      
      const completionTokens = this.countTokens(definition);
      const totalTokens = promptTokens + completionTokens;
      
      this.totalTokensUsed += totalTokens;

      console.log(`   Result: "${definition.substring(0, 60)}${definition.length > 60 ? '...' : ''}" (${totalTokens} tokens)`);

      // Check if it's a valid definition
      if (definition && 
          definition !== 'DEFINITION_NOT_FOUND' && 
          definition.length > 10 && 
          !definition.startsWith('ERROR') &&
          definition !== '...' &&
          definition !== '') {
        
        // Save to MongoDB
        await this.saveToMongo(concept, definition, 'data/fundamentals/fundamentals.md', sectionName, {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        });
        
        this.successfulExtractions++;
        console.log(`   ✅ Saved to MongoDB`);
        return { success: true, definition };
        
      } else {
        console.log(`   ❌ Invalid definition: "${definition}"`);
        return { success: false, definition };
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return { success: false, definition: `ERROR: ${error.message}` };
    }
  }

  async saveToMongo(concept, definition, sourceFile, sectionName, tokens) {
    try {
      const newDef = new Definition({
        concept: concept,
        definition: definition,
        source: {
          file: sourceFile,
          section: sectionName,
          section_type: 'header1'
        },
        metadata: {
          extraction_method: 'gpt-5-mini',
          prompt_tokens: tokens.prompt,
          completion_tokens: tokens.completion,
          total_tokens: tokens.total
        },
        extracted_at: new Date()
      });
      
      await newDef.save();
    } catch (error) {
      if (error.code === 11000) { // Duplicate key error
        console.log(`   ⚠️  Already exists: ${concept}`);
      } else {
        console.log(`   ⚠️  MongoDB error: ${error.message}`);
      }
    }
  }

  async processAllMissing() {
    try {
      const missingSections = await this.getMissingConcepts();
      const markdownContent = fs.readFileSync('data/fundamentals/fundamentals.md', 'utf8');
      
      if (missingSections.length === 0) {
        console.log('🎉 No missing concepts found! All definitions are complete.');
        return;
      }

      console.log(`\n🚀 Extracting ${missingSections.reduce((sum, s) => sum + s.count, 0)} missing concepts...\n`);
      
      for (const section of missingSections) {
        console.log(`\n📁 Section: ${section.section} (${section.count} concepts)`);
        console.log('─'.repeat(60));
        
        for (const concept of section.concepts) {
          // Try extraction
          const result = await this.extractDefinition(concept, markdownContent, section.section, false);
          
          // If failed, try once more
          if (!result.success) {
            console.log(`   🔄 Retrying "${concept}"...`);
            this.retries++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            const retryResult = await this.extractDefinition(concept, markdownContent, section.section, true);
            
            if (!retryResult.success) {
              this.failedExtractions++;
              console.log(`   ❌ Failed after retry: ${concept}`);
            }
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      console.log(`\n🎉 Extraction Complete!`);
      console.log(`✅ Successful: ${this.successfulExtractions}`);
      console.log(`❌ Failed: ${this.failedExtractions}`);
      console.log(`🔄 Retries: ${this.retries}`);
      console.log(`🪙 Total tokens: ${this.totalTokensUsed.toLocaleString()}`);

    } catch (error) {
      console.error('❌ Fatal error:', error.message);
    } finally {
      await dbConnection.disconnect();
    }
  }
}

async function main() {
  const extractor = new MissingConceptsExtractor();
  await extractor.processAllMissing();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MissingConceptsExtractor;