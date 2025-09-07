const fs = require('fs');
const dbConnection = require('./db/connection');
const { Definition } = require('./db/models');
const { encoding_for_model } = require('tiktoken');

require('dotenv').config();

const encoder = encoding_for_model('gpt-5-mini');

// Pre-defined definitions for concepts that are hard to extract automatically
const manualDefinitions = {
  "Input layer": "The layers include an input layer, one or more hidden layers, and an output layer.",
  "Hidden layer": "The layers include an input layer, one or more hidden layers, and an output layer.", 
  "Output layer": "The layers include an input layer, one or more hidden layers, and an output layer.",
  "Foundation models": "Foundation models are large AI models that have been trained on a broad set of unlabeled data that can be used for different tasks, with additional fine-tuning.",
  "Large language models (LLMs)": "Large language models (LLMs) are foundation models trained on large amounts of text data to understand and generate human language.",
  "Embeddings": "Embeddings are numerical representations of concepts converted to number sequences, which make it easy for computers to understand the relationships between those concepts.",
  "Fine-tuning": "Fine-tuning is a technique where you start with a foundation model and then you continue training it on a smaller, task-specific dataset.",
  "Neural networks": "Neural networks are computational models that are designed to mimic the way the human brain processes information.",
  "Multimodal model": "A multimodal model is a model that can process and understand multiple types of data or modalities, such as text, images, and audio.",
  "Pre-trained language model": "A pre-trained language model is a model that has already been trained on a large dataset and can be used as a starting point for various language tasks."
};

class FocusedExtractor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.successCount = 0;
    this.failCount = 0;
  }

  async getMissingConcepts() {
    await dbConnection.connect();
    
    const conceptsData = JSON.parse(fs.readFileSync('all_extracted_concepts.json', 'utf8'));
    const fundamentalsSections = conceptsData.results.filter(section => 
      section.file === 'data/fundamentals/fundamentals.md'
    );

    const existingConcepts = await Definition.find({ 'source.file': 'data/fundamentals/fundamentals.md' })
      .select('concept')
      .lean();

    const existingConceptNames = new Set(existingConcepts.map(d => d.concept));

    const missing = [];
    for (const section of fundamentalsSections) {
      for (const concept of section.concepts) {
        if (!existingConceptNames.has(concept)) {
          missing.push({
            concept,
            section: section.section
          });
        }
      }
    }

    return missing;
  }

  async saveToMongo(concept, definition, sourceFile, sectionName) {
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
          extraction_method: 'manual',
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        extracted_at: new Date()
      });
      
      await newDef.save();
      return true;
    } catch (error) {
      if (error.code === 11000) {
        console.log(`   ⚠️  Already exists: ${concept}`);
        return true;
      }
      console.log(`   ❌ MongoDB error: ${error.message}`);
      return false;
    }
  }

  async extractWithSimpleAPI(concept, sectionName) {
    const simplePrompt = `Define "${concept}" in the context of AWS AI/ML in one clear sentence.`;
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: simplePrompt }],
          max_completion_tokens: 150
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const definition = data.choices[0]?.message?.content?.trim() || '';
      
      if (definition && definition.length > 10) {
        return definition;
      }
      
      return null;
    } catch (error) {
      console.log(`   API error: ${error.message}`);
      return null;
    }
  }

  async processAllMissing() {
    try {
      const missing = await this.getMissingConcepts();
      
      if (missing.length === 0) {
        console.log('🎉 No missing concepts!');
        return;
      }

      console.log(`\n🎯 Processing ${missing.length} missing concepts\n`);

      for (const item of missing) {
        console.log(`🔄 Processing: "${item.concept}" (${item.section})`);
        
        let definition = null;
        let method = '';

        // Try manual definition first
        if (manualDefinitions[item.concept]) {
          definition = manualDefinitions[item.concept];
          method = 'manual';
        } else {
          // Try API extraction
          definition = await this.extractWithSimpleAPI(item.concept, item.section);
          method = 'api';
        }

        if (definition) {
          const saved = await this.saveToMongo(
            item.concept, 
            definition, 
            'data/fundamentals/fundamentals.md', 
            item.section
          );
          
          if (saved) {
            this.successCount++;
            console.log(`   ✅ Saved (${method}): "${definition.substring(0, 80)}..."`);
          }
        } else {
          this.failCount++;
          console.log(`   ❌ Failed to get definition`);
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log(`\n🎉 Complete! ✅ ${this.successCount} success, ❌ ${this.failCount} failed`);

    } catch (error) {
      console.error('❌ Fatal error:', error.message);
    } finally {
      await dbConnection.disconnect();
    }
  }
}

async function main() {
  const extractor = new FocusedExtractor();
  await extractor.processAllMissing();
}

if (require.main === module) {
  main().catch(console.error);
}