const fs = require('fs');
const dbConnection = require('./db/connection');
const { Definition, ExtractionSession } = require('./db/models');
const { encoding_for_model } = require('tiktoken');

require('dotenv').config();

const encoder = encoding_for_model('gpt-4');

class CompleteFundamentalsExtractor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.totalTokensUsed = 0;
    this.totalRequests = 0;
    this.successfulExtractions = 0;
    this.failedExtractions = 0;
  }

  countTokens(text) {
    return encoder.encode(text).length;
  }

  findDefinitionSection(concept, markdownContent, sectionName) {
    if (sectionName) {
      const lines = markdownContent.split('\n');
      
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
    }
    return markdownContent.substring(0, 1500);
  }

  createPrompt(concept, relevantSection) {
    return `Extract the exact definition for "${concept}" from this AWS AI course material.

INSTRUCTIONS:
1. Return ONLY the exact wording from the original text
2. Do NOT rephrase or summarize
3. If no definition exists, return "DEFINITION_NOT_FOUND"

CONCEPT: "${concept}"

CONTENT:
${relevantSection}

Definition:`;
  }

  async extractDefinition(concept, markdownContent, sectionName, sourceFile) {
    const relevantSection = this.findDefinitionSection(concept, markdownContent, sectionName);
    const prompt = this.createPrompt(concept, relevantSection);
    const promptTokens = this.countTokens(prompt);

    console.log(`\n🔄 Extracting: "${concept}" from "${sectionName}"`);

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
          max_completion_tokens: 300
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const definition = data.choices[0]?.message?.content?.trim() || '';
      
      const completionTokens = this.countTokens(definition);
      const totalTokens = promptTokens + completionTokens;
      
      this.totalTokensUsed += totalTokens;
      this.totalRequests++;

      console.log(`   Tokens: ${totalTokens}, Definition: "${definition.substring(0, 80)}..."`);

      // Save to MongoDB if valid
      if (definition && definition !== 'DEFINITION_NOT_FOUND' && definition.length > 10) {
        await this.saveToMongo(concept, definition, sourceFile, sectionName, {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        });
        this.successfulExtractions++;
        console.log(`   ✅ Saved to MongoDB`);
      } else {
        this.failedExtractions++;
        console.log(`   ❌ No valid definition found`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      return { concept, definition, success: definition && definition !== 'DEFINITION_NOT_FOUND' };

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.failedExtractions++;
      return { concept, definition: `ERROR: ${error.message}`, success: false };
    }
  }

  async saveToMongo(concept, definition, sourceFile, sectionName, tokens) {
    try {
      // Check if exists
      const existing = await Definition.findOne({
        concept: concept,
        'source.file': sourceFile,
        'source.section': sectionName
      });

      if (existing) {
        // Update existing
        await Definition.findByIdAndUpdate(existing._id, {
          definition: definition,
          metadata: {
            extraction_method: 'gpt-5-mini',
            prompt_tokens: tokens.prompt,
            completion_tokens: tokens.completion,
            total_tokens: tokens.total
          },
          extracted_at: new Date()
        });
      } else {
        // Create new
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
      }
    } catch (error) {
      console.log(`   ⚠️  MongoDB save error: ${error.message}`);
    }
  }

  async processAllSections() {
    try {
      await dbConnection.connect();
      
      const conceptsData = JSON.parse(fs.readFileSync('all_extracted_concepts.json', 'utf8'));
      const markdownContent = fs.readFileSync('data/fundamentals/fundamentals.md', 'utf8');
      
      const fundamentalsSections = conceptsData.results.filter(section => 
        section.file === 'data/fundamentals/fundamentals.md'
      );

      console.log(`\n🚀 Processing ${fundamentalsSections.length} sections from fundamentals.md\n`);
      
      for (const section of fundamentalsSections) {
        console.log(`\n📁 Section: ${section.section} (${section.concepts.length} concepts)`);
        console.log('─'.repeat(60));
        
        for (const concept of section.concepts) {
          await this.extractDefinition(
            concept,
            markdownContent,
            section.section,
            'data/fundamentals/fundamentals.md'
          );
        }
      }

      console.log(`\n\n🎉 Extraction Complete!`);
      console.log(`✅ Successful: ${this.successfulExtractions}`);
      console.log(`❌ Failed: ${this.failedExtractions}`);
      console.log(`🪙 Total tokens: ${this.totalTokensUsed.toLocaleString()}`);

    } catch (error) {
      console.error('❌ Fatal error:', error.message);
    } finally {
      await dbConnection.disconnect();
    }
  }
}

async function main() {
  const extractor = new CompleteFundamentalsExtractor();
  await extractor.processAllSections();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteFundamentalsExtractor;