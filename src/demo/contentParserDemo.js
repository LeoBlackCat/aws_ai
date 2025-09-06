import ContentParser from '../services/ContentParser.js';
import path from 'path';

/**
 * Demo script to showcase the enhanced ContentParser functionality
 */
async function demonstrateContentParser() {
  console.log('🚀 AWS AI Practitioner Content Parser Demo\n');
  
  const parser = new ContentParser();
  
  try {
    // Parse the AWS AI course
    const coursePath = path.join(process.cwd(), 'data');
    console.log(`📁 Parsing AWS AI course from: ${coursePath}`);
    
    const result = await parser.parseAWSCourse(coursePath);
    
    // Display course structure
    console.log('\n📚 Course Structure:');
    console.log(`Title: ${result.courseStructure.title}`);
    console.log(`Modules: ${result.courseStructure.modules.length}`);
    
    result.courseStructure.modules.forEach((module, index) => {
      console.log(`  ${index + 1}. ${module.title} (${module.lessons.length} lessons)`);
      module.lessons.forEach((lesson, lessonIndex) => {
        console.log(`     ${lessonIndex + 1}. ${lesson.title}`);
      });
    });
    
    // Display extracted content statistics
    console.log('\n📊 Extracted Content Statistics:');
    console.log(`Definitions: ${result.definitions.size}`);
    console.log(`Concepts: ${result.concepts.size}`);
    console.log(`Key Phrases: ${result.keyPhrases.size}`);
    console.log(`Assets: ${result.assets.size}`);
    console.log(`Cross-references: ${result.crossReferences.size}`);
    
    // Show some sample definitions
    console.log('\n🔍 Sample AWS Definitions:');
    let count = 0;
    for (const [key, def] of result.definitions) {
      if (count >= 5) break;
      if (def.term.toLowerCase().includes('aws') || def.term.toLowerCase().includes('amazon')) {
        console.log(`  • ${def.term}: ${def.definition.substring(0, 100)}...`);
        count++;
      }
    }
    
    // Show some sample key phrases
    console.log('\n🏷️  Sample AWS Key Phrases:');
    count = 0;
    for (const [key, phrase] of result.keyPhrases) {
      if (count >= 5) break;
      if (phrase.category === 'aws-service') {
        console.log(`  • ${phrase.phrase} (${phrase.category})`);
        count++;
      }
    }
    
    // Show slug mappings
    console.log('\n🔗 Sample URL Slug Mappings:');
    count = 0;
    for (const [key, slug] of result.slugMap) {
      if (count >= 5) break;
      console.log(`  • ${key} → ${slug}`);
      count++;
    }
    
    // Show assets
    console.log('\n🖼️  Sample Assets:');
    count = 0;
    for (const [key, asset] of result.assets) {
      if (count >= 5) break;
      console.log(`  • ${asset.filename} (${asset.type}) - ${asset.missing ? 'MISSING' : 'OK'}`);
      count++;
    }
    
    // Export for database
    const dbData = parser.exportForDatabase();
    console.log('\n💾 Database Export Summary:');
    console.log(`Course: ${dbData.course.title} (${dbData.course.slug})`);
    console.log(`Definitions for DB: ${dbData.definitions.length}`);
    console.log(`Assets for DB: ${dbData.assets.length}`);
    console.log(`Cross-references for DB: ${dbData.crossReferences.length}`);
    
    console.log('\n✅ Content parsing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during content parsing:', error.message);
    console.error('This is expected if the AWS AI course data is not available in the data/ directory');
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateContentParser();
}

export default demonstrateContentParser;