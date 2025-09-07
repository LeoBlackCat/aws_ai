/**
 * KnowledgeMiner - AWS-specific knowledge extraction service
 * Extracts AWS service names, definitions, terminology, and learning objectives
 * from course content to support intelligent quiz generation and concept mapping
 */

interface AWSService {
  name: string;
  fullName: string;
  category: string;
  confidence: number;
  context: string;
  sourceFile: string;
  module: string;
  lesson: string;
  position: number;
  description: string;
}

interface AWSTerminology {
  term: string;
  definition: string;
  type: 'acronym' | 'technical-term' | 'service-term';
  category: string;
  context: string;
  sourceFile: string;
  module: string;
  lesson: string;
  confidence: number;
}

interface LearningObjective {
  id: string;
  text: string;
  type: 'knowledge' | 'application' | 'analysis' | 'synthesis' | 'general';
  context: string;
  sourceFile: string;
  module: string;
  lesson: string;
  confidence: number;
  awsServices: string[];
  concepts: string[];
}

interface ConceptNode {
  id: string;
  type: 'service' | 'term' | 'concept';
  name: string;
  category: string;
  relatedTerms: Array<{ id: string; type?: string; similarity?: number }>;
  relatedServices: Array<{ id: string; type?: string; similarity?: number }>;
  learningObjectives: string[];
  confidence: number;
}

interface ProcessingContext {
  sourceFile?: string;
  module?: string;
  lesson?: string;
}

interface KnowledgeExtractionResult {
  services: Map<string, AWSService>;
  terminology: Map<string, AWSTerminology>;
  objectives: LearningObjective[];
  conceptMap: Map<string, ConceptNode>;
  summary: {
    servicesCount: number;
    terminologyCount: number;
    objectivesCount: number;
    conceptsCount: number;
  };
}

class KnowledgeMiner {
  private awsServices: Map<string, AWSService> = new Map();
  private awsTerminology: Map<string, AWSTerminology> = new Map();
  private conceptMap: Map<string, ConceptNode> = new Map();
  private learningObjectives: Map<string, LearningObjective> = new Map();
  
  private awsServicePatterns: Record<string, string[]> = {};
  private awsTerminologyPatterns: RegExp[] = [];
  private learningObjectiveIndicators: RegExp[] = [];

  constructor() {
    this.initializeAWSPatterns();
  }

  /**
   * Initialize AWS service patterns and known services
   */
  private initializeAWSPatterns(): void {
    // Common AWS service patterns and their categories
    this.awsServicePatterns = {
      // Compute services
      compute: [
        'EC2', 'Lambda', 'Elastic Compute Cloud', 'AWS Lambda', 'Fargate', 'ECS', 'EKS',
        'Elastic Container Service', 'Elastic Kubernetes Service', 'Batch', 'AWS Batch'
      ],
      
      // Storage services
      storage: [
        'S3', 'Simple Storage Service', 'EBS', 'Elastic Block Store', 'EFS', 
        'Elastic File System', 'FSx', 'Storage Gateway', 'AWS Backup'
      ],
      
      // Database services
      database: [
        'RDS', 'Relational Database Service', 'DynamoDB', 'Aurora', 'Redshift',
        'ElastiCache', 'Neptune', 'DocumentDB', 'Timestream', 'QLDB'
      ],
      
      // AI/ML services
      aiml: [
        'SageMaker', 'Amazon SageMaker', 'Bedrock', 'Amazon Bedrock', 'Rekognition',
        'Amazon Rekognition', 'Comprehend', 'Amazon Comprehend', 'Textract',
        'Amazon Textract', 'Polly', 'Amazon Polly', 'Transcribe', 'Amazon Transcribe',
        'Translate', 'Amazon Translate', 'Lex', 'Amazon Lex', 'Kendra', 'Amazon Kendra',
        'Personalize', 'Amazon Personalize', 'Forecast', 'Amazon Forecast',
        'CodeWhisperer', 'Amazon CodeWhisperer', 'Titan', 'Amazon Titan',
        'Claude', 'Anthropic Claude'
      ],
      
      // Analytics services
      analytics: [
        'Athena', 'Amazon Athena', 'EMR', 'Elastic MapReduce', 'Kinesis',
        'Amazon Kinesis', 'Glue', 'AWS Glue', 'QuickSight', 'Amazon QuickSight',
        'OpenSearch', 'Amazon OpenSearch'
      ],
      
      // Security services
      security: [
        'IAM', 'Identity and Access Management', 'Cognito', 'Amazon Cognito',
        'GuardDuty', 'Amazon GuardDuty', 'Macie', 'Amazon Macie', 'Inspector',
        'Amazon Inspector', 'Security Hub', 'AWS Security Hub', 'KMS',
        'Key Management Service', 'CloudTrail', 'AWS CloudTrail'
      ]
    };

    // AWS terminology patterns
    this.awsTerminologyPatterns = [
      // Service-related terms
      /\b(AWS|Amazon)\s+([A-Z][a-zA-Z\s]+?)(?=\s+(?:is|are|provides|offers|enables|allows|helps))/g,
      
      // Feature patterns
      /\b([A-Z][a-zA-Z\s]*?)\s+(?:feature|capability|service|tool|platform|framework)\b/g,
      
      // Acronym patterns
      /\b([A-Z]{2,})\s*\([^)]+\)/g,
      
      // Technical terms
      /\b(machine learning|artificial intelligence|deep learning|neural network|foundation model|large language model|generative AI|supervised learning|unsupervised learning|reinforcement learning|fine-tuning|prompt engineering|retrieval-augmented generation|natural language processing|computer vision|MLOps|inference|training|deployment|model|algorithm|dataset|feature|hyperparameter|embedding|vector|transformer|attention|tokenization|preprocessing|evaluation|metrics|accuracy|precision|recall|F1 score|ROC|AUC|bias|variance|overfitting|underfitting|regularization|cross-validation|ensemble|bagging|boosting|clustering|classification|regression|dimensionality reduction|feature engineering|data preprocessing|model selection|hyperparameter tuning|model evaluation|model deployment|model monitoring|A\/B testing|canary deployment|blue-green deployment|shadow deployment|batch inference|real-time inference|streaming|ETL|data pipeline|data lake|data warehouse|OLAP|OLTP|NoSQL|SQL|relational database|document database|key-value store|graph database|time series database|vector database|data governance|data quality|data lineage|metadata|schema|index|partition|sharding|replication|backup|disaster recovery|high availability|fault tolerance|scalability|elasticity|load balancing|auto scaling|containerization|microservices|serverless|event-driven|API|REST|GraphQL|webhook|message queue|pub\/sub|streaming|batch processing|real-time processing|edge computing|CDN|caching|compression|encryption|authentication|authorization|identity|access control|security|compliance|governance|audit|logging|monitoring|alerting|observability|tracing|metrics|dashboards|cost optimization|resource management|tagging|billing|pricing|reserved instances|spot instances|savings plans)\b/gi
    ];

    // Learning objective indicators
    this.learningObjectiveIndicators = [
      /you will learn/gi,
      /you will explore/gi,
      /you will understand/gi,
      /you will discover/gi,
      /you will gain/gi,
      /students will be able to/gi,
      /by the end of this/gi,
      /objectives?:/gi,
      /learning outcomes?:/gi,
      /goals?:/gi
    ];
  }

  /**
   * Extract AWS services and their definitions from content
   */
  async extractAWSServices(content: string, context: ProcessingContext = {}): Promise<Map<string, AWSService>> {
    const services = new Map<string, AWSService>();
    
    // Extract services by category
    Object.entries(this.awsServicePatterns).forEach(([category, serviceList]) => {
      serviceList.forEach(serviceName => {
        const serviceInfo = this.findServiceInContent(content, serviceName, category, context);
        if (serviceInfo) {
          const key = serviceInfo.name.toLowerCase();
          if (!services.has(key) || services.get(key)!.confidence < serviceInfo.confidence) {
            services.set(key, serviceInfo);
          }
        }
      });
    });

    // Extract services using pattern matching
    const patternServices = this.extractServicesUsingPatterns(content, context);
    patternServices.forEach((service, key) => {
      if (!services.has(key) || services.get(key)!.confidence < service.confidence) {
        services.set(key, service);
      }
    });

    return services;
  }

  /**
   * Find specific service in content and extract context
   */
  private findServiceInContent(
    content: string, 
    serviceName: string, 
    category: string, 
    context: ProcessingContext
  ): AWSService | null {
    const escapedName = serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match);
    }
    
    if (matches.length === 0) return null;

    // Find the best match with most context
    let bestMatch: AWSService | null = null;
    let maxContextScore = 0;

    matches.forEach(match => {
      const startIndex = match.index!;
      const contextBefore = content.substring(Math.max(0, startIndex - 200), startIndex);
      const contextAfter = content.substring(startIndex + match[0].length, Math.min(content.length, startIndex + match[0].length + 200));
      
      // Score based on context quality
      let contextScore = 0;
      
      // Higher score for definition patterns
      if (contextAfter.match(/\s+(is|are)\s+/)) contextScore += 3;
      if (contextBefore.match(/\*\*/) || contextAfter.match(/\*\*/)) contextScore += 2;
      if (contextAfter.match(/provides|offers|enables|allows|helps/)) contextScore += 2;
      
      if (contextScore > maxContextScore) {
        maxContextScore = contextScore;
        bestMatch = {
          name: serviceName,
          category,
          confidence: Math.min(1.0, contextScore / 5),
          context: (contextBefore + match[0] + contextAfter).trim(),
          sourceFile: context.sourceFile || 'unknown',
          module: context.module || 'unknown',
          lesson: context.lesson || 'unknown',
          position: startIndex,
          fullName: this.expandServiceName(serviceName),
          description: this.extractServiceDescription(content, startIndex)
        };
      }
    });

    return bestMatch;
  }

  /**
   * Extract services using pattern matching
   */
  private extractServicesUsingPatterns(content: string, context: ProcessingContext): Map<string, AWSService> {
    const services = new Map<string, AWSService>();
    
    // Pattern 1: AWS/Amazon service mentions
    const awsServiceRegex = /\b(AWS|Amazon)\s+([A-Z][a-zA-Z\s]+?)(?=\s+(?:is|are|provides|offers|enables|allows|helps|can|will))/g;
    let match;
    
    while ((match = awsServiceRegex.exec(content)) !== null) {
      const fullName = `${match[1]} ${match[2].trim()}`;
      const serviceName = match[2].trim();
      const key = serviceName.toLowerCase();
      
      if (!services.has(key) && serviceName.length > 2 && serviceName.length < 50) {
        services.set(key, {
          name: serviceName,
          fullName,
          category: this.categorizeService(serviceName),
          confidence: 0.7,
          context: this.extractContext(content, match.index!, 150),
          sourceFile: context.sourceFile || 'unknown',
          module: context.module || 'unknown',
          lesson: context.lesson || 'unknown',
          position: match.index!,
          description: this.extractServiceDescription(content, match.index!)
        });
      }
    }

    return services;
  }

  /**
   * Extract AWS terminology and acronyms
   */
  async extractAWSTerminology(content: string, context: ProcessingContext = {}): Promise<Map<string, AWSTerminology>> {
    const terminology = new Map<string, AWSTerminology>();
    
    // Extract acronyms with definitions - Pattern 1: ACRONYM (definition)
    const acronymRegex1 = /\b([A-Z]{2,})\s*\(([^)]+)\)/g;
    let match;
    
    while ((match = acronymRegex1.exec(content)) !== null) {
      const acronym = match[1];
      const definition = match[2];
      const key = acronym.toLowerCase();
      
      if (!terminology.has(key)) {
        terminology.set(key, {
          term: acronym,
          definition,
          type: 'acronym',
          category: this.categorizeAWSTerm(acronym, definition),
          context: this.extractContext(content, match.index!, 100),
          sourceFile: context.sourceFile || 'unknown',
          module: context.module || 'unknown',
          lesson: context.lesson || 'unknown',
          confidence: 0.9
        });
      }
    }

    // Extract acronyms with definitions - Pattern 2: Full Name (ACRONYM)
    const acronymRegex2 = /([A-Z][a-zA-Z\s]+?)\s*\(([A-Z]{2,})\)/g;
    
    while ((match = acronymRegex2.exec(content)) !== null) {
      const fullName = match[1].trim();
      const acronym = match[2];
      const key = acronym.toLowerCase();
      
      if (!terminology.has(key)) {
        terminology.set(key, {
          term: acronym,
          definition: fullName,
          type: 'acronym',
          category: this.categorizeAWSTerm(acronym, fullName),
          context: this.extractContext(content, match.index!, 100),
          sourceFile: context.sourceFile || 'unknown',
          module: context.module || 'unknown',
          lesson: context.lesson || 'unknown',
          confidence: 0.9
        });
      }
    }

    // Extract technical terms using patterns
    this.awsTerminologyPatterns.forEach(pattern => {
      // Reset regex lastIndex to avoid issues with global regex
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const term = match[1] || match[0];
        const key = term.toLowerCase();
        
        if (!terminology.has(key) && term.length > 2) {
          terminology.set(key, {
            term,
            definition: this.extractTermDefinition(content, match.index!, term),
            type: 'technical-term',
            category: this.categorizeAWSTerm(term),
            context: this.extractContext(content, match.index!, 150),
            sourceFile: context.sourceFile || 'unknown',
            module: context.module || 'unknown',
            lesson: context.lesson || 'unknown',
            confidence: 0.6
          });
        }
      }
    });

    return terminology;
  }

  /**
   * Extract learning objectives from content
   */
  async extractLearningObjectives(content: string, context: ProcessingContext = {}): Promise<LearningObjective[]> {
    const objectives: LearningObjective[] = [];
    
    this.learningObjectiveIndicators.forEach(indicator => {
      // Reset regex lastIndex to avoid issues with global regex
      indicator.lastIndex = 0;
      let match;
      while ((match = indicator.exec(content)) !== null) {
        const startIndex = match.index!;
        const objectiveText = this.extractObjectiveText(content, startIndex);
        
        if (objectiveText && objectiveText.length > 10) {
          objectives.push({
            id: `obj_${objectives.length + 1}`,
            text: objectiveText,
            type: this.classifyObjectiveType(objectiveText),
            context: this.extractContext(content, startIndex, 100),
            sourceFile: context.sourceFile || 'unknown',
            module: context.module || 'unknown',
            lesson: context.lesson || 'unknown',
            confidence: 0.8,
            awsServices: this.extractAWSServicesFromText(objectiveText),
            concepts: this.extractConceptsFromText(objectiveText)
          });
        }
      }
    });

    return objectives;
  }

  /**
   * Create concept mapping between AWS services and concepts
   */
  async createConceptMap(
    services: Map<string, AWSService>, 
    terminology: Map<string, AWSTerminology>, 
    objectives: LearningObjective[]
  ): Promise<Map<string, ConceptNode>> {
    const conceptMap = new Map<string, ConceptNode>();
    
    // Create nodes for services
    services.forEach((service, key) => {
      conceptMap.set(key, {
        id: key,
        type: 'service',
        name: service.name,
        category: service.category,
        relatedTerms: [],
        relatedServices: [],
        learningObjectives: [],
        confidence: service.confidence
      });
    });

    // Create nodes for terminology
    terminology.forEach((term, key) => {
      if (!conceptMap.has(key)) {
        conceptMap.set(key, {
          id: key,
          type: 'term',
          name: term.term,
          category: term.category,
          relatedTerms: [],
          relatedServices: [],
          learningObjectives: [],
          confidence: term.confidence
        });
      }
    });

    // Build relationships
    this.buildConceptRelationships(conceptMap, services, terminology, objectives);
    
    return conceptMap;
  }

  /**
   * Build relationships between concepts
   */
  private buildConceptRelationships(
    conceptMap: Map<string, ConceptNode>, 
    services: Map<string, AWSService>, 
    terminology: Map<string, AWSTerminology>, 
    objectives: LearningObjective[]
  ): void {
    // Link services mentioned together
    services.forEach((service1, key1) => {
      services.forEach((service2, key2) => {
        if (key1 !== key2) {
          const similarity = this.calculateContextSimilarity(service1.context, service2.context);
          if (similarity > 0.3) {
            const concept1 = conceptMap.get(key1);
            const concept2 = conceptMap.get(key2);
            if (concept1 && concept2) {
              concept1.relatedServices.push({ id: key2, similarity });
              concept2.relatedServices.push({ id: key1, similarity });
            }
          }
        }
      });
    });

    // Link terms to services
    terminology.forEach((term, termKey) => {
      services.forEach((service, serviceKey) => {
        if (this.isTermRelatedToService(term, service)) {
          const termConcept = conceptMap.get(termKey);
          const serviceConcept = conceptMap.get(serviceKey);
          if (termConcept && serviceConcept) {
            termConcept.relatedServices.push({ id: serviceKey, type: 'definition' });
            serviceConcept.relatedTerms.push({ id: termKey, type: 'definition' });
          }
        }
      });
    });

    // Link objectives to concepts
    objectives.forEach(objective => {
      objective.awsServices.forEach(serviceName => {
        const serviceKey = serviceName.toLowerCase();
        const concept = conceptMap.get(serviceKey);
        if (concept) {
          concept.learningObjectives.push(objective.id);
        }
      });
    });
  }

  // Helper methods

  /**
   * Expand service name to full name
   */
  private expandServiceName(serviceName: string): string {
    const expansions: Record<string, string> = {
      'EC2': 'Amazon Elastic Compute Cloud',
      'S3': 'Amazon Simple Storage Service',
      'RDS': 'Amazon Relational Database Service',
      'IAM': 'AWS Identity and Access Management',
      'VPC': 'Amazon Virtual Private Cloud',
      'EBS': 'Amazon Elastic Block Store',
      'EFS': 'Amazon Elastic File System',
      'ECS': 'Amazon Elastic Container Service',
      'EKS': 'Amazon Elastic Kubernetes Service',
      'EMR': 'Amazon Elastic MapReduce',
      'KMS': 'AWS Key Management Service'
    };
    
    return expansions[serviceName] || serviceName;
  }

  /**
   * Extract service description from surrounding context
   */
  private extractServiceDescription(content: string, position: number): string {
    const contextAfter = content.substring(position, Math.min(content.length, position + 300));
    
    // Look for definition patterns
    const definitionMatch = contextAfter.match(/\s+(is|are)\s+([^.!?]+[.!?])/);
    if (definitionMatch) {
      return definitionMatch[2].trim();
    }
    
    // Look for descriptive sentences
    const sentenceMatch = contextAfter.match(/[^.!?]*[.!?]/);
    if (sentenceMatch && sentenceMatch[0].length < 200) {
      return sentenceMatch[0].trim();
    }
    
    return '';
  }

  /**
   * Categorize AWS service by name patterns
   */
  private categorizeService(serviceName: string): string {
    const name = serviceName.toLowerCase();
    
    if (name.includes('sagemaker') || name.includes('bedrock') || name.includes('rekognition') || 
        name.includes('comprehend') || name.includes('textract') || name.includes('polly') ||
        name.includes('lex') || name.includes('kendra') || name.includes('personalize') ||
        name.includes('forecast') || name.includes('transcribe') || name.includes('translate')) {
      return 'aiml';
    } else if (name.includes('ec2') || name.includes('lambda') || name.includes('fargate') ||
               name.includes('ecs') || name.includes('eks') || name.includes('batch')) {
      return 'compute';
    } else if (name.includes('s3') || name.includes('ebs') || name.includes('efs') ||
               name.includes('storage') || name.includes('backup')) {
      return 'storage';
    } else if (name.includes('rds') || name.includes('dynamodb') || name.includes('aurora') ||
               name.includes('redshift') || name.includes('database')) {
      return 'database';
    } else if (name.includes('iam') || name.includes('cognito') || name.includes('guardduty') ||
               name.includes('security') || name.includes('kms')) {
      return 'security';
    } else if (name.includes('athena') || name.includes('emr') || name.includes('kinesis') ||
               name.includes('glue') || name.includes('quicksight') || name.includes('analytics')) {
      return 'analytics';
    }
    
    return 'general';
  }

  /**
   * Categorize AWS term
   */
  private categorizeAWSTerm(term: string, definition: string = ''): string {
    const text = `${term} ${definition}`.toLowerCase();
    
    if (text.includes('aws') || text.includes('amazon') || text.includes('service')) {
      return 'aws-service';
    } else if (text.includes('machine learning') || text.includes('artificial intelligence') || 
               text.includes('neural') || text.includes('model') || text.includes('algorithm') ||
               text.includes('natural language processing') || text.includes('computer vision') ||
               text.includes('deep learning') || text.includes('supervised learning') ||
               text.includes('unsupervised learning') || text.includes('reinforcement learning') ||
               text.includes('generative ai') || text.includes('foundation model') ||
               term.toLowerCase() === 'ml' || term.toLowerCase() === 'ai' || 
               term.toLowerCase() === 'nlp' || term.toLowerCase() === 'cv') {
      return 'ai-ml-concept';
    } else if (text.includes('data') || text.includes('training') || text.includes('inference') ||
               text.includes('deployment') || text.includes('evaluation') || text.includes('etl') ||
               text.includes('extract transform load')) {
      return 'ml-process';
    } else if (text.includes('security') || text.includes('encryption') || text.includes('authentication') ||
               text.includes('authorization') || text.includes('compliance')) {
      return 'security';
    } else if (text.includes('storage') || text.includes('database') || text.includes('backup') ||
               text.includes('replication')) {
      return 'data-storage';
    } else if (text.includes('network') || text.includes('vpc') || text.includes('load balancer') ||
               text.includes('cdn') || text.includes('api') || text.includes('virtual private cloud')) {
      return 'networking';
    }
    
    return 'general-tech';
  }

  /**
   * Extract context around a position
   */
  private extractContext(content: string, position: number, length: number = 150): string {
    const start = Math.max(0, position - length);
    const end = Math.min(content.length, position + length);
    return content.substring(start, end).trim();
  }

  /**
   * Extract term definition from context
   */
  private extractTermDefinition(content: string, position: number, term: string): string {
    const contextAfter = content.substring(position, Math.min(content.length, position + 200));
    
    // Look for "is/are" definitions
    const definitionMatch = contextAfter.match(new RegExp(`${term}\\s+(is|are)\\s+([^.!?]+[.!?])`, 'i'));
    if (definitionMatch) {
      return definitionMatch[2].trim();
    }
    
    return '';
  }

  /**
   * Extract objective text from content
   */
  private extractObjectiveText(content: string, startIndex: number): string {
    const afterMatch = content.substring(startIndex);
    
    // Find the complete sentence or paragraph containing the objective
    // Look for sentence ending with period, exclamation, or question mark
    const sentenceMatch = afterMatch.match(/[^.!?]*[.!?]/);
    if (sentenceMatch && sentenceMatch[0].length > 20) {
      return sentenceMatch[0].trim();
    }
    
    // Look for the rest of the line if no sentence ending found
    const lineMatch = afterMatch.match(/[^\n\r]*/);
    if (lineMatch && lineMatch[0].length > 10) {
      return lineMatch[0].trim();
    }
    
    // Look for multiple sentences up to 300 characters
    const multiSentenceMatch = afterMatch.substring(0, 300);
    const sentences = multiSentenceMatch.split(/[.!?]/);
    if (sentences.length > 1 && sentences[0].length > 10) {
      return sentences[0].trim() + '.';
    }
    
    // Fallback to first 200 characters
    return afterMatch.substring(0, 200).trim();
  }

  /**
   * Classify objective type
   */
  private classifyObjectiveType(objectiveText: string): LearningObjective['type'] {
    const text = objectiveText.toLowerCase();
    
    // Check for application keywords first (more specific)
    if (text.includes('apply') || text.includes('use') || text.includes('implement') || 
        text.includes('build') || text.includes('utilize') || text.includes('employ')) {
      return 'application';
    } else if (text.includes('analyze') || text.includes('evaluate') || text.includes('compare') ||
               text.includes('assess') || text.includes('examine') || text.includes('review')) {
      return 'analysis';
    } else if (text.includes('create') || text.includes('design') || text.includes('develop') ||
               text.includes('construct') || text.includes('generate') || text.includes('produce')) {
      return 'synthesis';
    } else if (text.includes('understand') || text.includes('learn about') || text.includes('explore') ||
               text.includes('discover') || text.includes('gain') || text.includes('know')) {
      return 'knowledge';
    }
    
    return 'general';
  }

  /**
   * Extract AWS services mentioned in text
   */
  private extractAWSServicesFromText(text: string): string[] {
    const services: string[] = [];
    
    Object.values(this.awsServicePatterns).flat().forEach(serviceName => {
      const regex = new RegExp(`\\b${serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(text)) {
        services.push(serviceName);
      }
    });

    // Also look for general AWS service patterns
    const awsServiceRegex = /\b(AWS|Amazon)\s+([A-Z][a-zA-Z\s]+)/g;
    let match;
    while ((match = awsServiceRegex.exec(text)) !== null) {
      const fullServiceName = `${match[1]} ${match[2].trim()}`;
      services.push(fullServiceName);
    }
    
    return Array.from(new Set(services)); // Remove duplicates
  }

  /**
   * Extract concepts from text
   */
  private extractConceptsFromText(text: string): string[] {
    const concepts: string[] = [];
    const conceptPatterns = [
      /\b(machine learning|artificial intelligence|deep learning|neural network|foundation model|large language model|generative AI)\b/gi,
      /\b(supervised learning|unsupervised learning|reinforcement learning|fine-tuning|prompt engineering)\b/gi,
      /\b(natural language processing|computer vision|MLOps|inference|training|deployment)\b/gi
    ];
    
    conceptPatterns.forEach(pattern => {
      // Reset regex lastIndex to avoid issues with global regex
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        concepts.push(match[0]);
      }
    });
    
    return Array.from(new Set(concepts)); // Remove duplicates
  }

  /**
   * Calculate similarity between two contexts
   */
  private calculateContextSimilarity(context1: string, context2: string): number {
    const words1 = new Set(context1.toLowerCase().split(/\s+/));
    const words2 = new Set(context2.toLowerCase().split(/\s+/));
    
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);
    const intersection = new Set(words1Array.filter(x => words2.has(x)));
    const union = new Set(words1Array.concat(words2Array));
    
    return intersection.size / union.size;
  }

  /**
   * Check if term is related to service
   */
  private isTermRelatedToService(term: AWSTerminology, service: AWSService): boolean {
    const termText = `${term.term} ${term.definition}`.toLowerCase();
    const serviceText = `${service.name} ${service.description}`.toLowerCase();
    
    // Check for direct mentions
    if (termText.includes(service.name.toLowerCase()) || serviceText.includes(term.term.toLowerCase())) {
      return true;
    }
    
    // Check for category overlap
    if (term.category === service.category) {
      return true;
    }
    
    // Check for context similarity
    return this.calculateContextSimilarity(term.context, service.context) > 0.4;
  }

  // Public API methods

  /**
   * Process content and extract all AWS knowledge
   */
  async processContent(content: string, context: ProcessingContext = {}): Promise<KnowledgeExtractionResult> {
    const services = await this.extractAWSServices(content, context);
    const terminology = await this.extractAWSTerminology(content, context);
    const objectives = await this.extractLearningObjectives(content, context);
    const conceptMap = await this.createConceptMap(services, terminology, objectives);
    
    return {
      services,
      terminology,
      objectives,
      conceptMap,
      summary: {
        servicesCount: services.size,
        terminologyCount: terminology.size,
        objectivesCount: objectives.length,
        conceptsCount: conceptMap.size
      }
    };
  }

  /**
   * Get extracted AWS services
   */
  getAWSServices(): Map<string, AWSService> {
    return this.awsServices;
  }

  /**
   * Get extracted terminology
   */
  getTerminology(): Map<string, AWSTerminology> {
    return this.awsTerminology;
  }

  /**
   * Get learning objectives
   */
  getLearningObjectives(): Map<string, LearningObjective> {
    return this.learningObjectives;
  }

  /**
   * Get concept map
   */
  getConceptMap(): Map<string, ConceptNode> {
    return this.conceptMap;
  }
}

export default KnowledgeMiner;
export type { 
  AWSService, 
  AWSTerminology, 
  LearningObjective, 
  ConceptNode, 
  ProcessingContext, 
  KnowledgeExtractionResult 
};