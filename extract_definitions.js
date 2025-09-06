const fs = require('fs');
const path = require('path');
const { encoding_for_model } = require('tiktoken');

// Load environment variables
require('dotenv').config();

// Initialize tiktoken encoder for GPT-5 models
const encoder = encoding_for_model('gpt-4'); // Use gpt-4 encoder as placeholder for GPT-5

class DefinitionExtractor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.totalTokensUsed = 0;
    this.totalRequests = 0;
    this.logFile = 'definition_extraction_log.txt';
    this.resultsFile = 'extracted_definitions.json';
    
    // Initialize log file
    this.log('=== Definition Extraction Session Started ===\n');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // Write to file
    fs.appendFileSync(this.logFile, logMessage);
    
    // Also output to console
    console.log(message);
  }

  countTokens(text) {
    return encoder.encode(text).length;
  }

  createPrompt(concept, relevantSection) {
    return `You are tasked with extracting the exact definition for a specific concept from AWS AI course material.

IMPORTANT INSTRUCTIONS:
1. You MUST return the EXACT wording from the original markdown file
2. DO NOT summarize, rephrase, or modify the original text
3. DO NOT add your own explanations or interpretations
4. Find the definition that appears in the provided content
5. If multiple definitions exist, use the most comprehensive one
6. If no definition is found, respond with "DEFINITION_NOT_FOUND"

CONCEPT TO DEFINE: "${concept}"

RELEVANT CONTENT SECTION:
${relevantSection}

Return ONLY the exact definition text from the markdown file, preserving all original formatting and wording.`;
  }

  findRelevantSection(concept, markdownContent) {
    // Find the section that contains the concept
    const sections = markdownContent.split(/(?=^#{1,3}\s)/m);
    
    for (const section of sections) {
      if (section.toLowerCase().includes(concept.toLowerCase()) || 
          section.toLowerCase().includes(concept.replace(/[()]/g, '').toLowerCase())) {
        return section.trim();
      }
    }
    
    // If not found in specific section, return first 2000 characters
    return markdownContent.substring(0, 2000);
  }

  async extractDefinition(concept, markdownContent) {
    const relevantSection = this.findRelevantSection(concept, markdownContent);
    const prompt = this.createPrompt(concept, relevantSection);
    const promptTokens = this.countTokens(prompt);
    
    this.log(`Processing concept: "${concept}"`);
    this.log(`Prompt tokens: ${promptTokens}`);

    try {
      const requestBody = {
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 300
      };

      this.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      this.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.log(`Error response body: ${errorText}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.log(`Response data: ${JSON.stringify(data, null, 2)}`);
      
      const definition = data.choices && data.choices[0] && data.choices[0].message 
        ? data.choices[0].message.content.trim() 
        : 'No content in response';
      const completionTokens = this.countTokens(definition);
      const totalTokens = promptTokens + completionTokens;
      
      this.totalTokensUsed += totalTokens;
      this.totalRequests++;

      this.log(`Response tokens: ${completionTokens}`);
      this.log(`Total tokens for this request: ${totalTokens}`);
      this.log(`Definition extracted: "${definition.substring(0, 100)}${definition.length > 100 ? '...' : ''}"`);
      this.log('---');

      return {
        concept,
        definition,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        }
      };

    } catch (error) {
      this.log(`ERROR extracting definition for "${concept}": ${error.message}`);
      return {
        concept,
        definition: 'ERROR: ' + error.message,
        tokens: {
          prompt: promptTokens,
          completion: 0,
          total: promptTokens
        }
      };
    }
  }

  async processConceptsBatch(concepts, markdownContent, batchName) {
    this.log(`\n=== Processing batch: ${batchName} ===`);
    this.log(`Concepts to process: ${concepts.length}`);
    
    const results = [];
    
    for (const concept of concepts) {
      const result = await this.extractDefinition(concept, markdownContent);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save results to file
    const existingResults = fs.existsSync(this.resultsFile) 
      ? JSON.parse(fs.readFileSync(this.resultsFile, 'utf8')) 
      : [];
    
    const updatedResults = [...existingResults, {
      batch: batchName,
      timestamp: new Date().toISOString(),
      results: results,
      tokens_summary: {
        batch_total: results.reduce((sum, r) => sum + r.tokens.total, 0),
        batch_requests: results.length
      }
    }];

    fs.writeFileSync(this.resultsFile, JSON.stringify(updatedResults, null, 2));
    
    this.log(`\n=== Batch ${batchName} completed ===`);
    this.log(`Batch token usage: ${results.reduce((sum, r) => sum + r.tokens.total, 0)}`);
    this.log(`Session total tokens: ${this.totalTokensUsed}`);
    this.log(`Session total requests: ${this.totalRequests}`);
    
    return results;
  }
}

async function main() {
  const extractor = new DefinitionExtractor();
  
  try {
    // Load the concepts and markdown content
    const conceptsData = JSON.parse(fs.readFileSync('all_extracted_concepts.json', 'utf8'));
    const markdownContent = fs.readFileSync('data/fundamentals/fundamentals.md', 'utf8');
    
    // Get the first section concepts (Introduction)
    const introductionSection = conceptsData.results.find(section => 
      section.file === 'data/fundamentals/fundamentals.md' && section.section === 'Introduction'
    );
    
    if (!introductionSection) {
      throw new Error('Introduction section not found in concepts data');
    }
    
    extractor.log(`Found Introduction section with ${introductionSection.concepts.length} concepts`);
    extractor.log(`Concepts: ${introductionSection.concepts.join(', ')}`);
    
    // Process the first batch of concepts
    await extractor.processConceptsBatch(
      introductionSection.concepts, 
      markdownContent, 
      'fundamentals_introduction'
    );
    
    extractor.log('\n=== Session Summary ===');
    extractor.log(`Total tokens used: ${extractor.totalTokensUsed}`);
    extractor.log(`Total requests made: ${extractor.totalRequests}`);
    extractor.log(`Average tokens per request: ${Math.round(extractor.totalTokensUsed / extractor.totalRequests)}`);
    
  } catch (error) {
    extractor.log(`FATAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DefinitionExtractor;