import KnowledgeMiner from '../services/KnowledgeMiner';

describe('KnowledgeMiner', () => {
  let knowledgeMiner: KnowledgeMiner;

  beforeEach(() => {
    knowledgeMiner = new KnowledgeMiner();
  });

  describe('AWS Service Extraction', () => {
    it('should extract AWS services from content', async () => {
      const content = `
        Amazon SageMaker is a fully managed service that provides every developer and data scientist 
        with the ability to build, train, and deploy machine learning models quickly. Amazon Bedrock 
        is a fully managed service that offers a choice of high-performing foundation models (FMs) 
        from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Stability AI, and Amazon 
        via a single API.
      `;

      const context = {
        sourceFile: 'test.md',
        module: 'fundamentals',
        lesson: 'ai-services'
      };

      const services = await knowledgeMiner.extractAWSServices(content, context);
      
      expect(services.size).toBeGreaterThan(0);
      expect(services.has('sagemaker')).toBe(true);
      expect(services.has('bedrock')).toBe(true);
      
      const sageMaker = services.get('sagemaker');
      expect(sageMaker).toBeDefined();
      expect(sageMaker?.category).toBe('aiml');
      expect(sageMaker?.confidence).toBeGreaterThan(0);
    });

    it('should extract service descriptions', async () => {
      const content = `
        Amazon Rekognition is a service that makes it easy to add image and video analysis to your applications.
      `;

      const services = await knowledgeMiner.extractAWSServices(content);
      const rekognition = services.get('rekognition');
      
      expect(rekognition).toBeDefined();
      expect(rekognition?.description).toContain('easy to add image and video analysis');
    });
  });

  describe('AWS Terminology Extraction', () => {
    it('should extract acronyms with definitions', async () => {
      const content = `
        Machine Learning (ML) is a type of artificial intelligence that enables computers to learn 
        without being explicitly programmed. Natural Language Processing (NLP) is a branch of AI 
        that helps computers understand, interpret and manipulate human language.
      `;

      const terminology = await knowledgeMiner.extractAWSTerminology(content);
      
      expect(terminology.has('ml')).toBe(true);
      expect(terminology.has('nlp')).toBe(true);
      
      const ml = terminology.get('ml');
      expect(ml?.type).toBe('acronym');
      expect(ml?.definition).toContain('Machine Learning');
    });

    it('should extract technical terms', async () => {
      const content = `
        Deep learning uses neural networks with multiple layers to model and understand complex patterns.
        Supervised learning requires labeled training data to learn patterns.
      `;

      const terminology = await knowledgeMiner.extractAWSTerminology(content);
      
      expect(terminology.has('deep learning')).toBe(true);
      expect(terminology.has('supervised learning')).toBe(true);
      
      const deepLearning = terminology.get('deep learning');
      expect(deepLearning?.category).toBe('ai-ml-concept');
    });
  });

  describe('Learning Objectives Extraction', () => {
    it('should extract learning objectives', async () => {
      const content = `
        In this course, you will learn about the foundations of machine learning and artificial intelligence.
        You will explore the connections between AI, ML, deep learning, and generative AI.
        You will understand how to use Amazon SageMaker for building ML models.
      `;

      const objectives = await knowledgeMiner.extractLearningObjectives(content);
      
      expect(objectives.length).toBeGreaterThan(0);
      
      const firstObjective = objectives[0];
      expect(firstObjective.type).toBe('knowledge');
      
      // Check if any objective contains Amazon SageMaker
      const hasAmazonSageMaker = objectives.some(obj => 
        obj.awsServices.some(service => service.includes('SageMaker')) ||
        obj.text.includes('Amazon SageMaker')
      );
      expect(hasAmazonSageMaker).toBe(true);
      
      // Check if any objective contains machine learning concepts
      const hasMachineLearning = objectives.some(obj => 
        obj.concepts.includes('machine learning') ||
        obj.text.toLowerCase().includes('machine learning')
      );
      expect(hasMachineLearning).toBe(true);
    });

    it('should classify objective types correctly', async () => {
      const content = `
        You will understand the basic concepts of AI.
        You will apply machine learning techniques to solve problems.
        You will analyze the performance of different models.
        You will create a complete ML pipeline.
      `;

      const objectives = await knowledgeMiner.extractLearningObjectives(content);
      
      expect(objectives.length).toBeGreaterThan(0);
      
      // Check that we can classify at least some objectives
      const hasKnowledge = objectives.some(obj => obj.type === 'knowledge');
      const hasOtherTypes = objectives.some(obj => obj.type !== 'knowledge' && obj.type !== 'general');
      
      expect(hasKnowledge || hasOtherTypes).toBe(true);
      
      // Verify that objectives contain the expected text
      const objectiveTexts = objectives.map(obj => obj.text.toLowerCase()).join(' ');
      expect(objectiveTexts).toContain('understand');
    });
  });

  describe('Concept Mapping', () => {
    it('should create concept relationships', async () => {
      const content = `
        Amazon SageMaker is a machine learning service that provides tools for data scientists.
        Machine Learning (ML) is used to build predictive models. SageMaker integrates with 
        other AWS services for complete ML workflows.
      `;

      const result = await knowledgeMiner.processContent(content);
      
      expect(result.conceptMap.size).toBeGreaterThan(0);
      
      const sageMakerConcept = result.conceptMap.get('sagemaker');
      expect(sageMakerConcept).toBeDefined();
      expect(sageMakerConcept?.type).toBe('service');
      expect(sageMakerConcept?.relatedTerms.length).toBeGreaterThan(0);
    });
  });

  describe('Full Content Processing', () => {
    it('should process complete content and return comprehensive results', async () => {
      const content = `
        # Introduction to AWS AI Services
        
        In this lesson, you will learn about Amazon SageMaker and Amazon Bedrock.
        
        ## Amazon SageMaker
        
        Amazon SageMaker is a fully managed Machine Learning (ML) platform that enables 
        developers and data scientists to build, train, and deploy ML models at scale.
        
        ## Key Concepts
        
        - **Supervised Learning**: Learning with labeled data
        - **Deep Learning**: Neural networks with multiple layers
        - **Natural Language Processing (NLP)**: Understanding human language
        
        You will understand how to use these services for building AI applications.
      `;

      const context = {
        sourceFile: 'ai-intro.md',
        module: 'fundamentals',
        lesson: 'aws-ai-services'
      };

      const result = await knowledgeMiner.processContent(content, context);
      
      // Check summary
      expect(result.summary.servicesCount).toBeGreaterThan(0);
      expect(result.summary.terminologyCount).toBeGreaterThan(0);
      expect(result.summary.objectivesCount).toBeGreaterThan(0);
      expect(result.summary.conceptsCount).toBeGreaterThan(0);
      
      // Check services
      expect(result.services.has('sagemaker')).toBe(true);
      expect(result.services.has('bedrock')).toBe(true);
      
      // Check terminology
      expect(result.terminology.has('ml')).toBe(true);
      expect(result.terminology.has('nlp')).toBe(true);
      expect(result.terminology.has('supervised learning')).toBe(true);
      
      // Check objectives
      expect(result.objectives.length).toBeGreaterThan(0);
      const hasLearningObjective = result.objectives.some(obj => 
        obj.text.includes('learn about Amazon SageMaker')
      );
      expect(hasLearningObjective).toBe(true);
      
      // Check concept map
      expect(result.conceptMap.has('sagemaker')).toBe(true);
      expect(result.conceptMap.has('ml')).toBe(true);
    });
  });

  describe('Service Categorization', () => {
    it('should categorize services correctly', async () => {
      const content = `
        Amazon S3 is a storage service. Amazon EC2 provides compute capacity.
        Amazon RDS is a database service. AWS IAM manages security and access.
        Amazon Athena is an analytics service.
      `;

      const services = await knowledgeMiner.extractAWSServices(content);
      
      expect(services.get('s3')?.category).toBe('storage');
      expect(services.get('ec2')?.category).toBe('compute');
      expect(services.get('rds')?.category).toBe('database');
      expect(services.get('iam')?.category).toBe('security');
      expect(services.get('athena')?.category).toBe('analytics');
    });
  });

  describe('Term Categorization', () => {
    it('should categorize terms correctly', async () => {
      const content = `
        Machine Learning (ML) is an AI technique. Amazon Web Services (AWS) provides cloud services.
        Encryption protects data security. Virtual Private Cloud (VPC) handles networking.
        Extract Transform Load (ETL) processes data.
      `;

      const terminology = await knowledgeMiner.extractAWSTerminology(content);
      
      expect(terminology.get('ml')?.category).toBe('ai-ml-concept');
      expect(terminology.get('aws')?.category).toBe('aws-service');
      expect(terminology.get('vpc')?.category).toBe('networking');
      expect(terminology.get('etl')?.category).toBe('ml-process');
    });
  });
});