const fs = require('fs');
const dbConnection = require('./db/connection');
const { Definition } = require('./db/models');

require('dotenv').config();

async function extractMissingDefinitions() {
  try {
    await dbConnection.connect();
    
    const markdownContent = fs.readFileSync('data/fundamentals/fundamentals.md', 'utf8');
    
    // Manual extraction of specific definitions that are clearly defined in the markdown
    const manualDefinitions = [
      {
        concept: "Generative AI",
        definition: "Generative AI is a subset of deep learning because it can adapt models built using deep learning, but without retraining or fine tuning. Generative AI systems are capable of generating new data based on the patterns and structures learned from training data.",
        section: "Introduction",
        file: "data/fundamentals/fundamentals.md"
      },
      {
        concept: "Training data",
        definition: "The machine learning process starts with collecting and processing training data. Bad data is often called garbage in, garbage out, and therefore an ML model is only as good as the data used to train it.",
        section: "Machine Learning Fundamentals",
        file: "data/fundamentals/fundamentals.md"
      },
      {
        concept: "Reinforcement learning", 
        definition: "In reinforcement learning, the machine is given only a performance score as guidance and semi-supervised learning, where only a portion of training data is labeled. Feedback is provided in the form of rewards or penalties for its actions, and the machine learns from this feedback to improve its decision-making over time.",
        section: "Machine Learning Fundamentals",
        file: "data/fundamentals/fundamentals.md"
      },
      {
        concept: "Semi-supervised learning",
        definition: "In reinforcement learning, the machine is given only a performance score as guidance and semi-supervised learning, where only a portion of training data is labeled.",
        section: "Machine Learning Fundamentals", 
        file: "data/fundamentals/fundamentals.md"
      },
      {
        concept: "Artificial neural network",
        definition: "The field of deep learning is inspired by the structure and function of the brain. It involves the use of artificial neural networks, which are computational models that are designed to mimic the way the human brain processes information.",
        section: "Deep Learning Fundamentals",
        file: "data/fundamentals/fundamentals.md"
      },
      {
        concept: "Computer vision",
        definition: "Computer vision is one of the applications that uses deep learning technologies.",
        section: "Deep Learning Fundamentals", 
        file: "data/fundamentals/fundamentals.md"
      },
      {
        concept: "Natural language processing (NLP)",
        definition: "Natural language processing is one of the applications that uses deep learning technologies.",
        section: "Deep Learning Fundamentals",
        file: "data/fundamentals/fundamentals.md"
      }
    ];

    console.log(`\n🎯 Adding ${manualDefinitions.length} missing definitions to MongoDB\n`);

    for (const def of manualDefinitions) {
      try {
        // Check if exists
        const existing = await Definition.findOne({
          concept: def.concept,
          'source.file': def.file,
          'source.section': def.section
        });

        if (existing) {
          console.log(`🔄 Updating: ${def.concept}`);
          await Definition.findByIdAndUpdate(existing._id, {
            definition: def.definition,
            extracted_at: new Date()
          });
        } else {
          console.log(`✨ Creating: ${def.concept}`);
          const newDef = new Definition({
            concept: def.concept,
            definition: def.definition,
            source: {
              file: def.file,
              section: def.section,
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
        }
      } catch (error) {
        console.log(`❌ Error with ${def.concept}: ${error.message}`);
      }
    }

    // Now check final counts
    const totalCount = await Definition.countDocuments();
    
    const sectionCounts = await Definition.aggregate([
      {
        $group: {
          _id: '$source.section',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    console.log(`\n📊 Updated Database Statistics:`);
    console.log(`Total Definitions: ${totalCount}`);
    console.log(`\nBy Section:`);
    sectionCounts.forEach(section => {
      console.log(`  ${section._id}: ${section.count} definitions`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dbConnection.disconnect();
  }
}

if (require.main === module) {
  extractMissingDefinitions().catch(console.error);
}