const fs = require('fs');
const path = require('path');
const { encoding_for_model } = require('tiktoken');

// Load environment variables
require('dotenv').config();

// Initialize tiktoken encoder for GPT-5 models
const encoder = encoding_for_model('gpt-5-mini');

class DefinitionExtractor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.totalTokensUsed = 0;
    this.totalRequests = 0;
    
    // Create session directory with timestamp
    this.sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.sessionDir = `logs/extraction_session_${this.sessionTimestamp}`;
    this.createDirectories();
    
    this.sessionLogFile = path.join(this.sessionDir, 'session.log');
    this.resultsFile = path.join(this.sessionDir, 'extracted_definitions.json');
    
    // Initialize session log file
    this.logSession('=== Definition Extraction Session Started ===');
    this.logSession(`Session Directory: ${this.sessionDir}`);
  }

  createDirectories() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    // Create session directory
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
    
    // Create subdirectories for requests and responses
    fs.mkdirSync(path.join(this.sessionDir, 'requests'), { recursive: true });
    fs.mkdirSync(path.join(this.sessionDir, 'responses'), { recursive: true });
  }

  logSession(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // Write to session log file
    fs.appendFileSync(this.sessionLogFile, logMessage);
    
    // Also output to console
    console.log(`[SESSION] ${message}`);
  }

  logRequest(concept, requestData) {
    const filename = `${concept.replace(/[^a-zA-Z0-9]/g, '_')}_request.json`;
    const filepath = path.join(this.sessionDir, 'requests', filename);
    fs.writeFileSync(filepath, JSON.stringify(requestData, null, 2));
    
    this.logSession(`Request logged: ${filepath}`);
  }

  logResponse(concept, responseData) {
    const filename = `${concept.replace(/[^a-zA-Z0-9]/g, '_')}_response.json`;
    const filepath = path.join(this.sessionDir, 'responses', filename);
    fs.writeFileSync(filepath, JSON.stringify(responseData, null, 2));
    
    this.logSession(`Response logged: ${filepath}`);
  }

  countTokens(text) {
    return encoder.encode(text).length;
  }

  findDefinitionSection(concept, markdownContent, sectionName) {
    // If we know the section name, extract the entire header1 section
    if (sectionName) {
      this.logSession(`Looking for header1 section: "${sectionName}"`);
      
      const lines = markdownContent.split('\n');
      
      // Find the header1 section (# Introduction, # Machine Learning Fundamentals, etc.)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for header1 that matches the section name
        if (line.match(/^#\s+/) && line.toLowerCase().includes(sectionName.toLowerCase())) {
          this.logSession(`Found header1 section "${sectionName}" at line ${i + 1}: "${line}"`);
          
          // Extract the entire section content
          let sectionContent = [line]; // Include the header
          
          // Add lines until we hit the next header1 (single #)
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            
            // Stop if we hit another header1 (single # at start)
            if (nextLine.match(/^#\s+/)) {
              this.logSession(`Section ends at line ${j + 1} (next header1): "${nextLine}"`);
              break;
            }
            
            sectionContent.push(nextLine);
          }
          
          const section = sectionContent.join('\n').trim();
          this.logSession(`Extracted header1 section (${section.length} chars): "${section.substring(0, 300)}..."`);
          return section;
        }
      }
    }
    
    this.logSession(`Header1 section "${sectionName}" not found, using fallback approach`);
    
    // Fallback: look for the concept in individual header2 sections
    const lines = markdownContent.split('\n');
    const conceptClean = concept.replace(/[()]/g, '').toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for header2 that matches the concept
      if (line.match(/^##\s+/) && 
          (line.toLowerCase().includes(conceptClean) || 
           line.toLowerCase().includes(concept.toLowerCase()))) {
        
        this.logSession(`Found header2 for "${concept}" at line ${i + 1}: "${line}"`);
        
        // Extract just this subsection
        let sectionContent = [line];
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          
          // Stop if we hit another header of same or higher level
          if (nextLine.match(/^#{1,2}\s/)) {
            break;
          }
          
          sectionContent.push(nextLine);
        }
        
        const section = sectionContent.join('\n').trim();
        this.logSession(`Extracted header2 section (${section.length} chars): "${section}"`);
        return section;
      }
    }
    
    // Last resort: return first 1500 characters
    this.logSession(`No section found for "${concept}", using first 1500 characters`);
    return markdownContent.substring(0, 1500);
  }

  createPrompt(concept, relevantSection) {
    return `You are tasked with extracting the exact definition for a specific concept from AWS AI course material.

CRITICAL INSTRUCTIONS:
1. You MUST return the EXACT wording from the original markdown file
2. DO NOT summarize, rephrase, or modify the original text in any way
3. DO NOT add your own explanations or interpretations
4. Find the precise definition sentence(s) that define the concept
5. Include the complete definition, even if it spans multiple sentences
6. If no explicit definition is found, respond with "DEFINITION_NOT_FOUND"
7. Remove markdown formatting (like ## headers) but keep the definition text intact

CONCEPT TO DEFINE: "${concept}"

RELEVANT CONTENT SECTION:
${relevantSection}

Extract and return ONLY the exact definition text from the markdown file. The definition should be the complete, precise explanation of what "${concept}" means.`;
  }

  async extractDefinition(concept, markdownContent, sectionName) {
    const relevantSection = this.findDefinitionSection(concept, markdownContent, sectionName);
    const prompt = this.createPrompt(concept, relevantSection);
    const promptTokens = this.countTokens(prompt);
    
    this.logSession(`\\n=== Processing concept: "${concept}" ===`);
    this.logSession(`Section name: "${sectionName}"`);
    this.logSession(`Prompt tokens: ${promptTokens}`);
    
    // Print the prompt content to console for verification
    console.log(`\n=== PROMPT FOR "${concept}" ===`);
    console.log(`Section: ${sectionName}`);
    console.log(`Relevant section preview (first 500 chars):`);
    console.log(relevantSection.substring(0, 500));
    console.log(`\n=== FULL PROMPT ===`);
    console.log(prompt);
    console.log(`=== END PROMPT ===\n`);

    try {
      const requestBody = {
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 500 // Increased for longer definitions
      };

      // Log the request
      this.logRequest(concept, {
        concept: concept,
        timestamp: new Date().toISOString(),
        prompt_tokens: promptTokens,
        request_body: requestBody,
        relevant_section_preview: relevantSection.substring(0, 500) + '...'
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      this.logSession(`API Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logSession(`ERROR: API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Log the response
      this.logResponse(concept, {
        concept: concept,
        timestamp: new Date().toISOString(),
        response_data: data
      });
      
      const definition = data.choices && data.choices[0] && data.choices[0].message 
        ? data.choices[0].message.content.trim() 
        : 'No content in response';
        
      const completionTokens = this.countTokens(definition);
      const totalTokens = promptTokens + completionTokens;
      
      this.totalTokensUsed += totalTokens;
      this.totalRequests++;

      this.logSession(`Completion tokens: ${completionTokens}`);
      this.logSession(`Total tokens for this request: ${totalTokens}`);
      this.logSession(`Definition extracted: "${definition}"`);
      this.logSession(`=== Concept "${concept}" completed ===\\n`);

      return {
        concept,
        definition,
        section_used: relevantSection.substring(0, 300) + '...',
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logSession(`ERROR extracting definition for "${concept}": ${error.message}`);
      return {
        concept,
        definition: 'ERROR: ' + error.message,
        section_used: relevantSection.substring(0, 300) + '...',
        tokens: {
          prompt: promptTokens,
          completion: 0,
          total: promptTokens
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async processConceptsBatch(concepts, markdownContent, batchName) {
    this.logSession(`\\n=== Processing batch: ${batchName} ===`);
    this.logSession(`Concepts to process: ${concepts.length}`);
    this.logSession(`Concepts: ${concepts.join(', ')}`);
    
    const results = [];
    
    for (const concept of concepts) {
      const result = await this.extractDefinition(concept, markdownContent, batchName.includes('introduction') ? 'Introduction' : null);
      results.push(result);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Save results to file
    const batchResults = {
      batch_name: batchName,
      session_timestamp: this.sessionTimestamp,
      session_directory: this.sessionDir,
      processed_concepts: results.length,
      results: results,
      tokens_summary: {
        batch_total: results.reduce((sum, r) => sum + r.tokens.total, 0),
        session_total: this.totalTokensUsed,
        batch_requests: results.length,
        session_requests: this.totalRequests
      }
    };

    fs.writeFileSync(this.resultsFile, JSON.stringify(batchResults, null, 2));
    
    this.logSession(`\\n=== Batch ${batchName} completed ===`);
    this.logSession(`Batch token usage: ${results.reduce((sum, r) => sum + r.tokens.total, 0)}`);
    this.logSession(`Session total tokens: ${this.totalTokensUsed}`);
    this.logSession(`Session total requests: ${this.totalRequests}`);
    this.logSession(`Results saved to: ${this.resultsFile}`);
    
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
    
    extractor.logSession(`Found Introduction section with ${introductionSection.concepts.length} concepts`);
    extractor.logSession(`Concepts: ${introductionSection.concepts.join(', ')}`);
    
    // Process the first batch of concepts
    await extractor.processConceptsBatch(
      introductionSection.concepts, 
      markdownContent, 
      'fundamentals_introduction_v2'
    );
    
    extractor.logSession('\\n=== Final Session Summary ===');
    extractor.logSession(`Total tokens used: ${extractor.totalTokensUsed}`);
    extractor.logSession(`Total requests made: ${extractor.totalRequests}`);
    extractor.logSession(`Average tokens per request: ${Math.round(extractor.totalTokensUsed / extractor.totalRequests)}`);
    extractor.logSession(`Session directory: ${extractor.sessionDir}`);
    
  } catch (error) {
    extractor.logSession(`FATAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DefinitionExtractor;