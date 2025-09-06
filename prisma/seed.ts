import { PrismaClient, Difficulty, TermCategory, AchievementCategory, BloomLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create the main AWS AI Practitioner course
  const course = await prisma.course.create({
    data: {
      title: 'AWS Artificial Intelligence Practitioner',
      description: 'Comprehensive learning plan for AWS AI Practitioner certification covering fundamentals, use cases, responsible AI, ML solutions, generative AI, and more.',
      version: '1.0.0',
      slug: 'aws-ai-practitioner',
      settings: {
        estimatedDuration: 480, // 8 hours total
        difficulty: 'BEGINNER',
        prerequisites: [],
        certificationPrep: true,
      },
    },
  })

  console.log('✅ Created course:', course.title)

  // Create modules based on the course structure
  const modules = [
    {
      title: 'Fundamentals of Machine Learning and Artificial Intelligence',
      slug: 'fundamentals',
      description: 'Learn about the foundations of ML and AI, exploring connections between AI, ML, deep learning, and generative AI.',
      order: 1,
      estimatedDuration: 60,
      folderPath: 'fundamentals',
    },
    {
      title: 'Exploring Artificial Intelligence Use Cases and Applications',
      slug: 'ai-usecases',
      description: 'Explore real-world AI, ML and generative AI use cases across healthcare, finance, marketing, entertainment, and more.',
      order: 2,
      estimatedDuration: 60,
      folderPath: 'ai_usecases',
    },
    {
      title: 'Responsible Artificial Intelligence Practices',
      slug: 'responsible-ai-practices',
      description: 'Learn about responsible AI practices, core dimensions, and AWS tools for developing responsible AI systems.',
      order: 3,
      estimatedDuration: 60,
      folderPath: 'responsible_ai_practices',
    },
    {
      title: 'Developing Machine Learning Solutions',
      slug: 'developing-ml',
      description: 'Learn about the ML lifecycle, AWS services, model evaluation techniques, and MLOps practices.',
      order: 4,
      estimatedDuration: 60,
      folderPath: 'developing_ml',
    },
    {
      title: 'Developing Generative Artificial Intelligence Solutions',
      slug: 'developing-genai',
      description: 'Explore the generative AI application lifecycle, foundation models, and deployment strategies.',
      order: 5,
      estimatedDuration: 60,
      folderPath: 'developing_genai',
    },
    {
      title: 'Optimizing Foundation Models',
      slug: 'optimizing-fm',
      description: 'Learn about RAG, fine-tuning, vector databases, and agents for improving foundation model performance.',
      order: 6,
      estimatedDuration: 60,
      folderPath: 'optimizing_fm',
    },
    {
      title: 'Security, Compliance, and Governance for AI Solutions',
      slug: 'security-compliance-governance',
      description: 'Understand security, compliance, and governance requirements for AI systems and AWS services.',
      order: 7,
      estimatedDuration: 60,
      folderPath: 'security_compliance_governance',
    },
    {
      title: 'Essentials of Prompt Engineering',
      slug: 'prompt-engineering',
      description: 'Learn fundamentals of crafting effective prompts, optimization techniques, and risk identification.',
      order: 8,
      estimatedDuration: 60,
      folderPath: 'prompt_engineering',
    },
  ]

  const createdModules = []
  for (const moduleData of modules) {
    const module = await prisma.module.create({
      data: {
        courseId: course.id,
        title: moduleData.title,
        slug: moduleData.slug,
        description: moduleData.description,
        order: moduleData.order,
        estimatedDuration: moduleData.estimatedDuration,
      },
    })
    createdModules.push({ ...module, folderPath: moduleData.folderPath })
    console.log(`✅ Created module: ${module.title}`)
  }

  // Create sample lessons for each module (placeholder structure)
  const lessonTemplates = [
    { title: 'Introduction', slug: 'introduction', order: 1 },
    { title: 'Core Concepts', slug: 'core-concepts', order: 2 },
    { title: 'AWS Services Overview', slug: 'aws-services', order: 3 },
    { title: 'Best Practices', slug: 'best-practices', order: 4 },
    { title: 'Knowledge Check', slug: 'knowledge-check', order: 5 },
  ]

  for (const module of createdModules) {
    for (const lessonTemplate of lessonTemplates) {
      await prisma.lesson.create({
        data: {
          moduleId: module.id,
          title: lessonTemplate.title,
          slug: lessonTemplate.slug,
          content: `# ${lessonTemplate.title}\n\nContent for ${lessonTemplate.title} in ${module.title} module.`,
          htmlContent: `<h1>${lessonTemplate.title}</h1><p>Content for ${lessonTemplate.title} in ${module.title} module.</p>`,
          order: lessonTemplate.order,
          estimatedReadTime: 10,
          frontmatter: {
            module: module.folderPath,
            difficulty: 'BEGINNER',
            tags: ['aws', 'ai', 'ml'],
          },
        },
      })
    }
    console.log(`✅ Created lessons for module: ${module.title}`)
  }

  // Create AWS Services
  const awsServices = [
    {
      name: 'Amazon Bedrock',
      fullName: 'Amazon Bedrock',
      category: 'Generative AI',
      description: 'Fully managed service that offers a choice of high-performing foundation models from leading AI companies.',
      useCases: ['Text generation', 'Chatbots', 'Content creation', 'Code generation'],
      pricingModel: 'Pay-per-use',
      features: ['Multiple foundation models', 'Serverless', 'Fine-tuning', 'Agents'],
      limitations: ['Regional availability', 'Model-specific limits'],
      relatedServices: ['Amazon SageMaker', 'AWS Lambda'],
    },
    {
      name: 'Amazon SageMaker',
      fullName: 'Amazon SageMaker',
      category: 'Machine Learning',
      description: 'Fully managed service that provides every developer and data scientist with the ability to build, train, and deploy ML models.',
      useCases: ['Model training', 'Model deployment', 'Data preparation', 'MLOps'],
      pricingModel: 'Pay-per-use',
      features: ['Jupyter notebooks', 'Built-in algorithms', 'Model registry', 'Pipelines'],
      limitations: ['Learning curve', 'Cost management complexity'],
      relatedServices: ['Amazon S3', 'AWS Lambda', 'Amazon ECR'],
    },
    {
      name: 'Amazon Rekognition',
      fullName: 'Amazon Rekognition',
      category: 'Computer Vision',
      description: 'Service that makes it easy to add image and video analysis to your applications.',
      useCases: ['Object detection', 'Facial recognition', 'Content moderation', 'Celebrity recognition'],
      pricingModel: 'Pay-per-use',
      features: ['Pre-trained models', 'Custom labels', 'Video analysis', 'Real-time processing'],
      limitations: ['Accuracy variations', 'Privacy considerations'],
      relatedServices: ['Amazon S3', 'AWS Lambda'],
    },
    {
      name: 'Amazon Comprehend',
      fullName: 'Amazon Comprehend',
      category: 'Natural Language Processing',
      description: 'Natural language processing service that uses machine learning to find insights and relationships in text.',
      useCases: ['Sentiment analysis', 'Entity extraction', 'Language detection', 'Topic modeling'],
      pricingModel: 'Pay-per-use',
      features: ['Pre-trained models', 'Custom classification', 'Real-time analysis', 'Batch processing'],
      limitations: ['Language support', 'Domain-specific accuracy'],
      relatedServices: ['Amazon S3', 'AWS Lambda'],
    },
    {
      name: 'Amazon Textract',
      fullName: 'Amazon Textract',
      category: 'Document Analysis',
      description: 'Service that automatically extracts text, handwriting, and data from scanned documents.',
      useCases: ['Document processing', 'Form extraction', 'Table extraction', 'Invoice processing'],
      pricingModel: 'Pay-per-use',
      features: ['OCR capabilities', 'Form understanding', 'Table extraction', 'Handwriting recognition'],
      limitations: ['Document quality dependency', 'Format limitations'],
      relatedServices: ['Amazon S3', 'AWS Lambda'],
    },
  ]

  for (const serviceData of awsServices) {
    await prisma.aWSService.create({
      data: serviceData,
    })
  }
  console.log('✅ Created AWS services')

  // Create sample terms and definitions
  const terms = [
    {
      term: 'Machine Learning',
      definition: 'A subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.',
      category: 'AI_CONCEPT' as TermCategory,
      difficulty: 'BEGINNER' as Difficulty,
    },
    {
      term: 'Foundation Model',
      definition: 'Large-scale pre-trained models that can be adapted for a wide range of downstream tasks.',
      category: 'AI_CONCEPT' as TermCategory,
      difficulty: 'INTERMEDIATE' as Difficulty,
    },
    {
      term: 'RAG',
      definition: 'Retrieval Augmented Generation - A technique that combines pre-trained language models with external knowledge retrieval.',
      category: 'TECHNICAL_TERM' as TermCategory,
      difficulty: 'ADVANCED' as Difficulty,
    },
    {
      term: 'Fine-tuning',
      definition: 'The process of adapting a pre-trained model to a specific task or domain by training it on task-specific data.',
      category: 'TECHNICAL_TERM' as TermCategory,
      difficulty: 'INTERMEDIATE' as Difficulty,
    },
    {
      term: 'Prompt Engineering',
      definition: 'The practice of designing and optimizing input prompts to get better outputs from language models.',
      category: 'TECHNICAL_TERM' as TermCategory,
      difficulty: 'BEGINNER' as Difficulty,
    },
  ]

  for (const termData of terms) {
    await prisma.term.create({
      data: termData,
    })
  }
  console.log('✅ Created terms and definitions')

  // Create achievements
  const achievements = [
    {
      title: 'First Steps',
      description: 'Complete your first lesson',
      icon: '🎯',
      category: 'LEARNING' as AchievementCategory,
      criteria: { type: 'lesson_completed', count: 1 },
      xpReward: 50,
    },
    {
      title: 'AWS Fundamentals Master',
      description: 'Complete the Fundamentals module',
      icon: '🏗️',
      category: 'MASTERY' as AchievementCategory,
      criteria: { type: 'module_completed', moduleSlug: 'fundamentals' },
      xpReward: 200,
    },
    {
      title: 'Quiz Champion',
      description: 'Score 90% or higher on 5 quizzes',
      icon: '🏆',
      category: 'MASTERY' as AchievementCategory,
      criteria: { type: 'quiz_high_score', count: 5, threshold: 0.9 },
      xpReward: 300,
    },
    {
      title: 'Consistent Learner',
      description: 'Study for 7 days in a row',
      icon: '🔥',
      category: 'CONSISTENCY' as AchievementCategory,
      criteria: { type: 'study_streak', days: 7 },
      xpReward: 150,
    },
    {
      title: 'Flashcard Master',
      description: 'Review 100 flashcards',
      icon: '📚',
      category: 'LEARNING' as AchievementCategory,
      criteria: { type: 'cards_reviewed', count: 100 },
      xpReward: 100,
    },
  ]

  for (const achievementData of achievements) {
    await prisma.achievement.create({
      data: achievementData,
    })
  }
  console.log('✅ Created achievements')

  // Create sample AWS scenarios
  const scenarios = [
    {
      title: 'E-commerce Recommendation System',
      description: 'A retail company wants to implement a recommendation system to suggest products to customers based on their browsing and purchase history.',
      businessContext: 'Increase sales and customer engagement through personalized recommendations',
      difficulty: 'INTERMEDIATE' as Difficulty,
      services: ['Amazon Personalize', 'Amazon S3', 'AWS Lambda'],
      solution: 'Use Amazon Personalize to build and deploy ML-powered recommendation models',
      alternatives: ['Amazon SageMaker with custom algorithms', 'Third-party recommendation engines'],
      tradeoffs: {
        cost: 'Amazon Personalize is more expensive but requires less ML expertise',
        complexity: 'Managed service vs custom implementation trade-off',
        timeToMarket: 'Faster with managed service',
      },
    },
    {
      title: 'Document Processing Automation',
      description: 'A financial services company needs to extract data from thousands of loan application documents daily.',
      businessContext: 'Reduce manual processing time and improve accuracy in document handling',
      difficulty: 'BEGINNER' as Difficulty,
      services: ['Amazon Textract', 'Amazon S3', 'AWS Lambda'],
      solution: 'Use Amazon Textract to automatically extract text and data from documents',
      alternatives: ['Manual data entry', 'Third-party OCR solutions'],
      tradeoffs: {
        accuracy: 'High accuracy with Amazon Textract vs manual errors',
        cost: 'Initial setup cost vs long-term labor savings',
        scalability: 'Automatic scaling vs manual resource management',
      },
    },
  ]

  for (const scenarioData of scenarios) {
    await prisma.aWSScenario.create({
      data: scenarioData,
    })
  }
  console.log('✅ Created AWS scenarios')

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })