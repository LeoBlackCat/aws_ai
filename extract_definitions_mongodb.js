const fs = require('fs');
const path = require('path');
const { encoding_for_model } = require('tiktoken');
const dbConnection = require('./db/connection');
const { Definition, ExtractionSession } = require('./db/models');

// Load environment variables
require('dotenv').config();

// Initialize tiktoken encoder for GPT-5 models
const encoder = encoding_for_model('gpt-4'); // Use gpt-4 encoder as placeholder for GPT-5

class MongoDefinitionExtractor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.totalTokensUsed = 0;
    this.totalRequests = 0;
    this.successfulExtractions = 0;
    this.failedExtractions = 0;
    
    // Create session directory with timestamp
    this.sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.sessionDir = `logs/extraction_session_${this.sessionTimestamp}`;
    this.sessionName = `fundamentals_extraction_${this.sessionTimestamp}`;
    this.createDirectories();
    
    this.sessionLogFile = path.join(this.sessionDir, 'session.log');
    this.currentSession = null;
    
    // Initialize session log file
    this.logSession('=== MongoDB Definition Extraction Session Started ===');
    this.logSession(`Session Name: ${this.sessionName}`);
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
  }

  logResponse(concept, responseData) {
    const filename = `${concept.replace(/[^a-zA-Z0-9]/g, '_')}_response.json`;
    const filepath = path.join(this.sessionDir, 'responses', filename);
    fs.writeFileSync(filepath, JSON.stringify(responseData, null, 2));
  }

  countTokens(text) {
    return encoder.encode(text).length;
  }

  async initializeSession(sourceFile, totalConcepts) {
    try {
      this.currentSession = new ExtractionSession({
        session_name: this.sessionName,
        session_directory: this.sessionDir,
        source_file: sourceFile,
        total_concepts: totalConcepts,
        started_at: new Date()
      });

      await this.currentSession.save();
      this.logSession(`Created session record in MongoDB: ${this.currentSession._id}`);
      
      return this.currentSession;
    } catch (error) {
      this.logSession(`ERROR creating session: ${error.message}`);
      throw error;
    }
  }

  async updateSession() {
    if (this.currentSession) {
      try {
        await ExtractionSession.findByIdAndUpdate(this.currentSession._id, {
          successful_extractions: this.successfulExtractions,
          failed_extractions: this.failedExtractions,
          total_tokens_used: this.totalTokensUsed,
          average_tokens_per_request: this.totalRequests > 0 ? Math.round(this.totalTokensUsed / this.totalRequests) : 0,
          completed_at: new Date(),
          status: 'completed'
        });

        this.logSession('Updated session record in MongoDB');
      } catch (error) {
        this.logSession(`ERROR updating session: ${error.message}`);
      }
    }
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
          this.logSession(`Extracted header1 section (${section.length} chars)`);
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
        this.logSession(`Extracted header2 section (${section.length} chars)`);
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

  async saveDefinitionToMongo(concept, definition, sourceFile, sectionName, tokens, batchName) {
    try {
      // Check if definition already exists
      const existingDef = await Definition.findOne({
        concept: concept,
        'source.file': sourceFile,
        'source.section': sectionName
      });

      if (existingDef) {
        this.logSession(`Definition for "${concept}" already exists in MongoDB, updating...`);
        
        await Definition.findByIdAndUpdate(existingDef._id, {
          definition: definition,
          metadata: {
            batch_name: batchName,
            extraction_method: 'gpt-5-mini',
            prompt_tokens: tokens.prompt,
            completion_tokens: tokens.completion,
            total_tokens: tokens.total
          },
          extracted_at: new Date()
        });

        this.logSession(`Updated existing definition for "${concept}"`);
        return existingDef._id;
      } else {
        // Create new definition
        const newDefinition = new Definition({
          concept: concept,
          definition: definition,
          source: {
            file: sourceFile,
            section: sectionName,
            section_type: 'header1'
          },
          metadata: {
            batch_name: batchName,
            extraction_method: 'gpt-5-mini',
            prompt_tokens: tokens.prompt,
            completion_tokens: tokens.completion,
            total_tokens: tokens.total
          },
          extracted_at: new Date()
        });

        const savedDef = await newDefinition.save();
        this.logSession(`Saved new definition to MongoDB: ${savedDef._id}`);
        return savedDef._id;
      }
    } catch (error) {
      this.logSession(`ERROR saving definition to MongoDB: ${error.message}`);
      throw error;
    }
  }

  async extractDefinition(concept, markdownContent, sectionName, sourceFile, batchName) {
    const relevantSection = this.findDefinitionSection(concept, markdownContent, sectionName);
    const prompt = this.createPrompt(concept, relevantSection);
    const promptTokens = this.countTokens(prompt);
    
    this.logSession(`\n=== Processing concept: "${concept}" ===`);
    this.logSession(`Section name: "${sectionName}"`);
    this.logSession(`Prompt tokens: ${promptTokens}`);

    try {
      const requestBody = {
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 500
      };

      // Log the request
      this.logRequest(concept, {
        concept: concept,
        timestamp: new Date().toISOString(),
        prompt_tokens: promptTokens,
        request_body: requestBody,
        relevant_section_preview: relevantSection.substring(0, 300) + '...'
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

      const tokens = {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      };

      this.logSession(`Completion tokens: ${completionTokens}`);
      this.logSession(`Total tokens for this request: ${totalTokens}`);
      this.logSession(`Definition extracted: "${definition}"`);

      // Save to MongoDB if we got a valid definition
      if (definition && definition !== 'DEFINITION_NOT_FOUND' && definition !== 'No content in response') {
        const mongoId = await this.saveDefinitionToMongo(
          concept, 
          definition, 
          sourceFile, 
          sectionName, 
          tokens, 
          batchName
        );
        
        this.successfulExtractions++;
        this.logSession(`✅ Successfully saved to MongoDB: ${mongoId}`);
      } else {
        this.failedExtractions++;
        this.logSession(`❌ Failed to extract valid definition for "${concept}"`);
      }

      this.logSession(`=== Concept "${concept}" completed ===\n`);

      return {
        concept,
        definition,
        success: definition && definition !== 'DEFINITION_NOT_FOUND' && definition !== 'No content in response',
        tokens,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.failedExtractions++;
      this.logSession(`ERROR extracting definition for "${concept}": ${error.message}`);
      return {
        concept,
        definition: 'ERROR: ' + error.message,
        success: false,
        tokens: {
          prompt: promptTokens,
          completion: 0,
          total: promptTokens
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async processConceptsBatch(concepts, markdownContent, sectionName, sourceFile, batchName) {
    this.logSession(`\n=== Processing batch: ${batchName} ===`);
    this.logSession(`Section: ${sectionName}`);
    this.logSession(`Source file: ${sourceFile}`);
    this.logSession(`Concepts to process: ${concepts.length}`);
    this.logSession(`Concepts: ${concepts.join(', ')}`);
    
    const results = [];
    
    for (const concept of concepts) {
      const result = await this.extractDefinition(concept, markdownContent, sectionName, sourceFile, batchName);
      results.push(result);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.logSession(`\n=== Batch ${batchName} completed ===`);
    this.logSession(`Successful extractions: ${results.filter(r => r.success).length}/${results.length}`);
    this.logSession(`Batch token usage: ${results.reduce((sum, r) => sum + r.tokens.total, 0)}`);
    this.logSession(`Session total tokens: ${this.totalTokensUsed}`);
    this.logSession(`Session total requests: ${this.totalRequests}`);
    
    return results;
  }
}

async function main() {
  const extractor = new MongoDefinitionExtractor();
  
  try {
    // Connect to MongoDB
    await dbConnection.connect();
    
    // Load the concepts and markdown content
    const conceptsData = JSON.parse(fs.readFileSync('all_extracted_concepts.json', 'utf8'));
    const markdownContent = fs.readFileSync('data/fundamentals/fundamentals.md', 'utf8');
    
    // Get all sections from fundamentals.md
    const fundamentalsSections = conceptsData.results.filter(section => 
      section.file === 'data/fundamentals/fundamentals.md'
    );
    
    extractor.logSession(`Found ${fundamentalsSections.length} sections in fundamentals.md`);
    
    // Initialize session in MongoDB
    const totalConcepts = fundamentalsSections.reduce((sum, section) => sum + section.concepts.length, 0);
    await extractor.initializeSession('data/fundamentals/fundamentals.md', totalConcepts);
    
    // Process each section
    for (const section of fundamentalsSections) {
      const batchName = `fundamentals_${section.section.toLowerCase().replace(/\s+/g, '_')}`;
      
      extractor.logSession(`\n🚀 Starting section: ${section.section} (${section.concepts.length} concepts)`);
      
      await extractor.processConceptsBatch(
        section.concepts,
        markdownContent,
        section.section,
        'data/fundamentals/fundamentals.md',
        batchName
      );
    }
    
    // Update session record
    await extractor.updateSession();
    
    extractor.logSession('\n=== Final Session Summary ===');
    extractor.logSession(`Total concepts processed: ${extractor.totalRequests}`);
    extractor.logSession(`Successful extractions: ${extractor.successfulExtractions}`);
    extractor.logSession(`Failed extractions: ${extractor.failedExtractions}`);
    extractor.logSession(`Total tokens used: ${extractor.totalTokensUsed}`);
    extractor.logSession(`Average tokens per request: ${Math.round(extractor.totalTokensUsed / extractor.totalRequests)}`);
    extractor.logSession(`Session directory: ${extractor.sessionDir}`);
    
    console.log('\n🎉 All definitions from fundamentals.md saved to MongoDB!');
    
  } catch (error) {
    extractor.logSession(`FATAL ERROR: ${error.message}`);
    if (extractor.currentSession) {
      await ExtractionSession.findByIdAndUpdate(extractor.currentSession._id, {
        status: 'failed',
        completed_at: new Date()
      });
    }
    process.exit(1);
  } finally {
    await dbConnection.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MongoDefinitionExtractor;