/**
 * Demo script for AI Tutoring System
 * Shows how to use the TutorService with different modes
 */

import TutorService, { TutorContext, TutorMode } from '../services/TutorService';
import VectorDatabase from '../services/VectorDatabase';

async function runTutorDemo() {
  console.log('🤖 AI Tutor Demo Starting...\n');

  // Initialize the tutor service
  const tutorService = new TutorService();

  // Sample learning context
  const context: TutorContext = {
    userId: 'demo-user',
    courseId: 'aws-ai-practitioner',
    currentLesson: 'sagemaker-overview',
    learningHistory: [
      {
        type: 'lesson_completed',
        timestamp: new Date(),
        content: 'Introduction to Machine Learning',
        performance: 0.8,
        difficulty: 'medium'
      }
    ],
    mode: TutorMode.ANSWER
  };

  // Demo 1: Basic Q&A
  console.log('📚 Demo 1: Basic Question & Answer Mode');
  console.log('Question: "What is Amazon SageMaker?"');
  
  try {
    const response1 = await tutorService.chat('What is Amazon SageMaker?', context);
    console.log('Answer:', response1.message);
    console.log('Citations:', response1.citations.length);
    console.log('Follow-up questions:', response1.followUpQuestions);
    console.log('Confidence:', Math.round(response1.confidence * 100) + '%\n');
  } catch (error) {
    console.log('Note: This demo requires OpenAI API key to work fully\n');
  }

  // Demo 2: Socratic Mode
  console.log('🤔 Demo 2: Socratic Questioning Mode');
  context.mode = TutorMode.SOCRATIC;
  
  try {
    const socraticQuestion = await tutorService.generateSocraticQuestion('machine learning', context);
    console.log('Socratic Question:', socraticQuestion);
    
    const response2 = await tutorService.chat('I want to learn about supervised learning', context);
    console.log('Socratic Response:', response2.message);
    console.log('Mode:', response2.mode, '\n');
  } catch (error) {
    console.log('Note: This demo requires OpenAI API key to work fully\n');
  }

  // Demo 3: Answer Evaluation
  console.log('✅ Demo 3: Answer Evaluation');
  
  try {
    const evaluation = await tutorService.evaluateAnswer(
      'What is supervised learning?',
      'Supervised learning is a type of machine learning where the algorithm learns from labeled training data to make predictions on new, unseen data.',
      context
    );
    
    console.log('Evaluation Results:');
    console.log('- Correct:', evaluation.isCorrect);
    console.log('- Score:', Math.round(evaluation.score * 100) + '%');
    console.log('- Feedback:', evaluation.feedback);
    console.log('- Improvements:', evaluation.improvements);
    console.log('- Related Concepts:', evaluation.relatedConcepts, '\n');
  } catch (error) {
    console.log('Note: This demo requires OpenAI API key to work fully\n');
  }

  // Demo 4: Content Ingestion
  console.log('📖 Demo 4: Content Ingestion for RAG');
  
  const sampleContent = [
    {
      id: 'sagemaker-intro',
      content: `Amazon SageMaker is a fully managed service that provides every developer and data scientist with the ability to build, train, and deploy machine learning (ML) models quickly. SageMaker removes the heavy lifting from each step of the machine learning process to make it easier to develop high quality models.

Key features of Amazon SageMaker include:
- Built-in algorithms and frameworks
- Managed Jupyter notebooks
- Automatic model tuning
- One-click deployment
- Model monitoring and management

SageMaker supports popular ML frameworks like TensorFlow, PyTorch, and Scikit-learn.`,
      module: 'AI Services',
      lesson: 'SageMaker Overview',
      source: 'course'
    },
    {
      id: 'rekognition-intro',
      content: `Amazon Rekognition makes it easy to add image and video analysis to your applications using proven, highly scalable, deep learning technology that requires no machine learning expertise to use.

With Amazon Rekognition, you can identify objects, people, text, scenes, and activities in images and videos, as well as detect any inappropriate content. Amazon Rekognition also provides highly accurate facial analysis and facial search capabilities that you can use to detect, analyze, and compare faces for a wide variety of user verification, people counting, and public safety use cases.`,
      module: 'AI Services',
      lesson: 'Rekognition Overview',
      source: 'course'
    }
  ];

  try {
    await tutorService.ingestCourseContent(sampleContent);
    console.log('✅ Content ingested successfully');
    console.log('- Processed', sampleContent.length, 'lessons');
    console.log('- Ready for RAG-powered responses\n');
  } catch (error) {
    console.log('Note: Content ingestion requires vector database setup\n');
  }

  // Demo 5: Vector Database Setup (if configured)
  console.log('🔍 Demo 5: Vector Database Setup');
  
  if (process.env.PINECONE_API_KEY) {
    try {
      const vectorDB = new VectorDatabase({
        apiKey: process.env.PINECONE_API_KEY,
        indexName: 'aws-ai-course-demo',
        dimension: 1536
      });

      const isConnected = await vectorDB.testConnection();
      console.log('Vector Database Status:', isConnected ? '✅ Connected' : '❌ Not Connected');
      
      if (isConnected) {
        const stats = await vectorDB.getStats();
        console.log('Database Stats:', stats);
      }
    } catch (error) {
      console.log('Vector database setup requires Pinecone configuration');
    }
  } else {
    console.log('Vector database demo requires PINECONE_API_KEY environment variable');
  }

  console.log('\n🎉 Demo completed!');
  console.log('\nTo use the full AI tutoring system:');
  console.log('1. Set up OpenAI API key in environment variables');
  console.log('2. Configure Pinecone vector database (optional but recommended)');
  console.log('3. Ingest your course content');
  console.log('4. Start tutoring sessions with different modes');
  console.log('\nAvailable modes:');
  console.log('- ANSWER: Direct answers to questions');
  console.log('- SOCRATIC: Guided learning through questions');
  console.log('- DRILL: Quick practice questions');
  console.log('- EXPLAIN: Detailed explanations of concepts');
}

// Demo helper functions
function demonstrateAWSServiceExtraction() {
  console.log('\n🔧 Bonus: AWS Service Extraction Demo');
  
  const sampleText = `
  In this lesson, we'll explore Amazon SageMaker for machine learning, 
  Amazon Rekognition for computer vision, and Amazon Comprehend for 
  natural language processing. We'll also look at AWS Lambda for 
  serverless computing and Amazon S3 for storage.
  `;

  const tutorService = new TutorService();
  const awsServices = tutorService['extractAWSServices'](sampleText);
  const concepts = tutorService['extractConcepts'](sampleText);

  console.log('Extracted AWS Services:', awsServices);
  console.log('Extracted Concepts:', concepts);
}

async function demonstrateContentChunking() {
  console.log('\n📝 Bonus: Content Chunking Demo');
  
  const longContent = {
    id: 'demo-content',
    content: 'Machine learning is a subset of artificial intelligence. '.repeat(50),
    module: 'Fundamentals',
    lesson: 'ML Basics',
    source: 'demo'
  };

  const tutorService = new TutorService();
  const chunks = await tutorService['chunkContent'](longContent);

  console.log('Original content length:', longContent.content.length);
  console.log('Number of chunks created:', chunks.length);
  console.log('First chunk preview:', chunks[0]?.content.substring(0, 100) + '...');
}

// Run the demo
if (require.main === module) {
  runTutorDemo()
    .then(async () => {
      demonstrateAWSServiceExtraction();
      await demonstrateContentChunking();
    })
    .catch(console.error);
}

export { runTutorDemo, demonstrateAWSServiceExtraction, demonstrateContentChunking };