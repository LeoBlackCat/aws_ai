#!/usr/bin/env node

const queries = require('./db/queries');

async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;
        
      case 'search':
        const searchTerm = args[1];
        if (!searchTerm) {
          console.log('Usage: node cli_mongo.js search <term>');
          process.exit(1);
        }
        await searchDefinitions(searchTerm);
        break;
        
      case 'concept':
        const conceptName = args[1];
        if (!conceptName) {
          console.log('Usage: node cli_mongo.js concept <name>');
          process.exit(1);
        }
        await findByConcept(conceptName);
        break;
        
      case 'section':
        const sectionName = args[1];
        if (!sectionName) {
          console.log('Usage: node cli_mongo.js section <name>');
          process.exit(1);
        }
        await findBySection(sectionName);
        break;
        
      case 'sections':
        await showSections();
        break;
        
      case 'files':
        await showFiles();
        break;
        
      case 'sessions':
        await showSessions();
        break;
        
      case 'random':
        const count = parseInt(args[1]) || 3;
        await showRandom(count);
        break;
        
      case 'export':
        await exportData();
        break;
        
      case 'all':
        await showAll();
        break;
        
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await queries.disconnect();
  }
}

async function showStats() {
  console.log('\n📊 Database Statistics');
  console.log('='.repeat(50));
  
  const stats = await queries.getStats();
  const sessionStats = await queries.getSessionStats();
  
  console.log(`Total Definitions: ${stats.total_definitions}`);
  console.log(`Files Processed: ${stats.total_files}`);
  console.log(`Sections Covered: ${stats.total_sections}`);
  console.log(`Average Definition Length: ${stats.avg_definition_length} characters`);
  console.log(`Total Tokens Used: ${stats.total_tokens.toLocaleString()}`);
  console.log(`\\nExtraction Success Rate: ${sessionStats.success_rate.toFixed(1)}%`);
  console.log(`Completed Sessions: ${sessionStats.completed_sessions}/${sessionStats.total_sessions}`);
  console.log();
}

async function searchDefinitions(term) {
  console.log(`\\n🔍 Searching for: "${term}"`);
  console.log('='.repeat(50));
  
  const results = await queries.searchText(term);
  
  if (results.length === 0) {
    console.log('No definitions found.');
    return;
  }
  
  results.forEach((def, index) => {
    console.log(`${index + 1}. **${def.concept}**`);
    console.log(`   Section: ${def.source.section} (${def.source.file})`);
    console.log(`   Definition: "${def.definition}"`);
    console.log(`   Score: ${def.score?.toFixed(2) || 'N/A'}`);
    console.log();
  });
}

async function findByConcept(conceptName) {
  console.log(`\\n🎯 Finding concepts matching: "${conceptName}"`);
  console.log('='.repeat(50));
  
  const results = await queries.findByConcept(conceptName);
  
  if (results.length === 0) {
    console.log('No matching concepts found.');
    return;
  }
  
  results.forEach((def, index) => {
    console.log(`${index + 1}. **${def.concept}**`);
    console.log(`   Section: ${def.source.section}`);
    console.log(`   File: ${def.source.file}`);
    console.log(`   Definition: "${def.definition}"`);
    console.log(`   Extracted: ${new Date(def.extracted_at).toLocaleString()}`);
    console.log();
  });
}

async function findBySection(sectionName) {
  console.log(`\\n📁 Definitions in section: "${sectionName}"`);
  console.log('='.repeat(50));
  
  const results = await queries.findBySection(sectionName);
  
  if (results.length === 0) {
    console.log('No definitions found in this section.');
    return;
  }
  
  console.log(`Found ${results.length} definitions:\\n`);
  
  results.forEach((def, index) => {
    console.log(`${index + 1}. **${def.concept}**`);
    console.log(`   "${def.definition}"`);
    console.log();
  });
}

async function showSections() {
  console.log('\\n📚 Definitions by Section');
  console.log('='.repeat(50));
  
  const sections = await queries.getDefinitionsBySection();
  
  sections.forEach((section) => {
    console.log(`\\n## ${section._id.section}`);
    console.log(`File: ${section._id.file}`);
    console.log(`Concepts: ${section.count}`);
    console.log(`Tokens: ${section.total_tokens.toLocaleString()}`);
    console.log(`Definitions: ${section.concepts.join(', ')}`);
  });
  console.log();
}

async function showFiles() {
  console.log('\\n📄 Definitions by File');
  console.log('='.repeat(50));
  
  const files = await queries.getDefinitionsByFile();
  
  files.forEach((file) => {
    console.log(`\\n## ${file.file}`);
    console.log(`Total Definitions: ${file.count}`);
    console.log(`Sections: ${file.sections_count} (${file.sections.join(', ')})`);
    console.log(`Total Tokens: ${file.total_tokens.toLocaleString()}`);
  });
  console.log();
}

async function showSessions() {
  console.log('\\n🏃 Recent Extraction Sessions');
  console.log('='.repeat(50));
  
  const sessions = await queries.getSessions({ limit: 5 });
  
  sessions.forEach((session, index) => {
    console.log(`\\n${index + 1}. ${session.session_name}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Started: ${new Date(session.started_at).toLocaleString()}`);
    if (session.completed_at) {
      console.log(`   Completed: ${new Date(session.completed_at).toLocaleString()}`);
    }
    console.log(`   Progress: ${session.successful_extractions || 0}/${session.total_concepts || 0}`);
    console.log(`   Tokens: ${(session.total_tokens_used || 0).toLocaleString()}`);
  });
  console.log();
}

async function showRandom(count) {
  console.log(`\\n🎲 ${count} Random Definitions`);
  console.log('='.repeat(50));
  
  const results = await queries.getRandomDefinitions(count);
  
  results.forEach((def, index) => {
    console.log(`${index + 1}. **${def.concept}** (${def.source.section})`);
    console.log(`   "${def.definition}"`);
    console.log();
  });
}

async function exportData() {
  console.log('\\n📤 Exporting Definitions');
  console.log('='.repeat(50));
  
  const exportData = await queries.exportToJSON({ includeMetadata: false });
  
  // Save to file
  const fs = require('fs');
  const filename = `definitions_export_${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  
  console.log(`✅ Exported ${exportData.total_definitions} definitions to ${filename}`);
  console.log();
}

async function showAll() {
  console.log('\\n📖 All Definitions');
  console.log('='.repeat(50));
  
  const sections = await queries.getDefinitionsBySection();
  
  for (const section of sections) {
    console.log(`\\n## ${section._id.section}`);
    console.log('─'.repeat(30));
    
    const definitions = await queries.findBySection(section._id.section);
    
    definitions.forEach((def, index) => {
      console.log(`${index + 1}. **${def.concept}**`);
      console.log(`   "${def.definition}"`);
      console.log();
    });
  }
}

function showHelp() {
  console.log(`
🗄️  MongoDB Definition Database CLI

Usage: node cli_mongo.js <command> [arguments]

Commands:
  stats                    Show database statistics
  search <term>           Search definitions by text
  concept <name>          Find definitions by concept name
  section <name>          Find definitions by section name
  sections                List all sections with counts
  files                   List all files with counts
  sessions                Show recent extraction sessions
  random [count]          Show random definitions (default: 3)
  export                  Export all definitions to JSON
  all                     Show all definitions organized by section
  help                    Show this help message

Examples:
  node cli_mongo.js stats
  node cli_mongo.js search "machine learning"
  node cli_mongo.js concept "AI"
  node cli_mongo.js section "Introduction"
  node cli_mongo.js random 5
`);
}

// Run CLI if called directly
if (require.main === module) {
  runCLI().catch(console.error);
}

module.exports = { runCLI };