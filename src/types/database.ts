import type { 
  User, 
  Course, 
  Module, 
  Lesson, 
  Quiz, 
  Question, 
  Card, 
  Term, 
  AWSService, 
  AWSScenario,
  UserProgress,
  QuizAttempt,
  CardReview,
  Achievement,
  UserAchievement,
  LearningSession,
  TutorSession,
  Difficulty,
  TermCategory,
  QuestionType,
  CardType,
  ProgressStatus,
  AchievementCategory,
  TutorMode,
  MessageRole
} from '@prisma/client'

// Extended types with relations
export interface CourseWithModules extends Course {
  modules: ModuleWithLessons[]
}

export interface ModuleWithLessons extends Module {
  lessons: LessonWithDetails[]
}

export interface LessonWithDetails extends Lesson {
  module: Module
  terms: Term[]
  progress?: UserProgress[]
  quizzes: Quiz[]
  cards: Card[]
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[]
  lesson?: Lesson
}

export interface UserWithProfile extends User {
  progress: UserProgress[]
  achievements: UserAchievement[]
  sessions: LearningSession[]
}

export interface QuizAttemptWithDetails extends QuizAttempt {
  quiz: Quiz
  user: User
  answers: Answer[]
}

export interface CardWithTerm extends Card {
  term?: Term
  lesson?: Lesson
  reviews: CardReview[]
}

export interface AchievementWithUsers extends Achievement {
  users: UserAchievement[]
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Learning analytics types
export interface LearningAnalytics {
  totalTimeSpent: number
  lessonsCompleted: number
  quizzesTaken: number
  averageScore: number
  currentStreak: number
  weakAreas: string[]
  strongAreas: string[]
  retentionRate: number
}

export interface ProgressSummary {
  courseProgress: number
  moduleProgress: { [moduleId: string]: number }
  recentActivity: LearningActivity[]
  upcomingReviews: Card[]
}

export interface LearningActivity {
  type: 'lesson' | 'quiz' | 'card_review' | 'achievement'
  timestamp: Date
  details: any
  xpEarned?: number
}

// SRS (Spaced Repetition System) types
export interface SRSReviewData {
  cardId: string
  interval: number
  easeFactor: number
  repetitions: number
  nextReview: Date
}

export interface ReviewSession {
  cards: CardWithTerm[]
  totalCards: number
  newCards: number
  reviewCards: number
  estimatedTime: number
}

// Quiz generation types
export interface QuizGenerationOptions {
  lessonId?: string
  difficulty?: Difficulty
  questionCount: number
  questionTypes: QuestionType[]
  includeAWSServices?: string[]
  timeLimit?: number
}

export interface GeneratedQuiz {
  title: string
  questions: GeneratedQuestion[]
  difficulty: Difficulty
  estimatedTime: number
}

export interface GeneratedQuestion {
  type: QuestionType
  stem: string
  choices?: string[]
  correctAnswer: any
  rationale: string
  difficulty: Difficulty
  awsServices: string[]
  bloomLevel: string
}

// Content parsing types
export interface ParsedContent {
  title: string
  content: string
  htmlContent: string
  frontmatter: Record<string, any>
  extractedTerms: ExtractedTerm[]
  assets: AssetReference[]
  crossReferences: CrossReference[]
}

export interface ExtractedTerm {
  term: string
  definition: string
  category: TermCategory
  context: string
  confidence: number
}

export interface AssetReference {
  filename: string
  path: string
  type: string
  alt?: string
  caption?: string
}

export interface CrossReference {
  target: string
  anchor?: string
  context: string
}

// Export all Prisma types for convenience
export type {
  User,
  Course,
  Module,
  Lesson,
  Quiz,
  Question,
  Card,
  Term,
  AWSService,
  AWSScenario,
  UserProgress,
  QuizAttempt,
  CardReview,
  Achievement,
  UserAchievement,
  LearningSession,
  TutorSession,
  Difficulty,
  TermCategory,
  QuestionType,
  CardType,
  ProgressStatus,
  AchievementCategory,
  TutorMode,
  MessageRole,
}