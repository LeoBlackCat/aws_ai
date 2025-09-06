const dbConnection = require('./db/connection');
const { Definition, ExtractionSession } = require('./db/models');

async function queryMongoDB() {
  try {
    await dbConnection.connect();
    
    console.log('\n🔍 Querying MongoDB for saved definitions...\n');
    
    // Get count of definitions
    const count = await Definition.countDocuments();
    console.log(`📊 Total definitions in database: ${count}`);
    
    if (count === 0) {
      console.log('❌ No definitions found in database');
      return;
    }
    
    // Get all definitions grouped by section
    const definitions = await Definition.find()
      .sort({ 'source.section': 1, extracted_at: 1 })
      .lean();
    
    // Group by section
    const sections = {};
    definitions.forEach(def => {
      const section = def.source.section;
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(def);
    });
    
    console.log(`\n📁 Definitions found in ${Object.keys(sections).length} sections:\n`);
    
    for (const [sectionName, sectionDefs] of Object.entries(sections)) {
      console.log(`\n## ${sectionName} (${sectionDefs.length} definitions):`);
      console.log('─'.repeat(50));
      
      sectionDefs.forEach((def, index) => {
        console.log(`${index + 1}. **${def.concept}**`);
        console.log(`   "${def.definition}"`);
        console.log(`   📅 ${new Date(def.extracted_at).toLocaleString()}`);
        console.log();
      });
    }
    
    // Get extraction session info
    const sessions = await ExtractionSession.find()
      .sort({ started_at: -1 })
      .limit(5)
      .lean();
    
    if (sessions.length > 0) {
      console.log('\n📋 Recent Extraction Sessions:');
      console.log('─'.repeat(50));
      
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.session_name}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Started: ${new Date(session.started_at).toLocaleString()}`);
        if (session.completed_at) {
          console.log(`   Completed: ${new Date(session.completed_at).toLocaleString()}`);
        }
        console.log(`   Successful: ${session.successful_extractions || 0}/${session.total_concepts || 0}`);
        console.log(`   Total tokens: ${session.total_tokens_used || 0}`);
        console.log();
      });
    }
    
  } catch (error) {
    console.error('❌ Error querying MongoDB:', error.message);
  } finally {
    await dbConnection.disconnect();
  }
}

// Run the query
if (require.main === module) {
  queryMongoDB().catch(console.error);
}

module.exports = queryMongoDB;