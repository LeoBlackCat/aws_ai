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
  achievem