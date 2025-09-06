import { prisma } from '../prisma'
import type { 
  CourseWithModules, 
  ModuleWithLessons, 
  LessonWithDetails,
  ProgressSummary 
} from '../../types/database'

export class CourseService {
  /**
   * Get all courses
   */
  static async getAllCourses(): Promise<CourseWithModules[]> {
    return prisma.course.findMany({
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                module: true,
                terms: true,
                quizzes: true,
                cards: true,
              },
            },
          },
        },
      },
    }) as Promise<CourseWithModules[]>
  }

  /**
   * Get course by slug
   */
  static async getCourseBySlug(slug: string): Promise<CourseWithModules | null> {
    return prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                module: true,
                terms: true,
                quizzes: true,
                cards: true,
              },
            },
          },
        },
      },
    }) as Promise<CourseWithModules | null>
  }

  /**
   * Get module by slug
   */
  static async getModuleBySlug(courseSlug: string, moduleSlug: string): Promise<ModuleWithLessons | null> {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
    })

    if (!course) return null

    return prisma.module.findFirst({
      where: {
        courseId: course.id,
        slug: moduleSlug,
      },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            module: true,
            terms: true,
            progress: true,
            quizzes: true,
            cards: true,
          },
        },
      },
    }) as Promise<ModuleWithLessons | null>
  }

  /**
   * Get lesson by slug
   */
  static async getLessonBySlug(
    courseSlug: string, 
    moduleSlug: string, 
    lessonSlug: string
  ): Promise<LessonWithDetails | null> {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
    })

    if (!course) return null

    const module = await prisma.module.findFirst({
      where: {
        courseId: course.id,
        slug: moduleSlug,
      },
    })

    if (!module) return null

    return prisma.lesson.findFirst({
      where: {
        moduleId: module.id,
        slug: lessonSlug,
      },
      include: {
        module: true,
        terms: true,
        progress: true,
        quizzes: {
          include: {
            questions: true,
          },
        },
        cards: true,
      },
    }) as Promise<LessonWithDetails | null>
  }

  /**
   * Get user progress for a course
   */
  static async getUserCourseProgress(userId: string, courseSlug: string): Promise<ProgressSummary> {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                progress: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    })

    if (!course) {
      throw new Error('Course not found')
    }

    let totalLessons = 0
    let completedLessons = 0
    const moduleProgress: { [moduleId: string]: number } = {}

    for (const module of course.modules) {
      let moduleTotal = 0
      let moduleCompleted = 0

      for (const lesson of module.lessons) {
        totalLessons++
        moduleTotal++

        const progress = lesson.progress[0]
        if (progress && progress.status === 'COMPLETED') {
          completedLessons++
          moduleCompleted++
        }
      }

      moduleProgress[module.id] = moduleTotal > 0 ? (moduleCompleted / moduleTotal) * 100 : 0
    }

    const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

    // Get recent activity
    const recentActivity = await prisma.learningSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 10,
    })

    // Get upcoming card reviews
    const upcomingReviews = await prisma.card.findMany({
      where: {
        nextReview: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
        reviews: {
          some: {
            userId,
          },
        },
      },
      include: {
        term: true,
        lesson: true,
      },
      take: 20,
    })

    return {
      courseProgress,
      moduleProgress,
      recentActivity: recentActivity.map(session => ({
        type: 'lesson' as const,
        timestamp: session.startTime,
        details: session.activities,
        xpEarned: session.xpEarned,
      })),
      upcomingReviews,
    }
  }

  /**
   * Update lesson progress
   */
  static async updateLessonProgress(
    userId: string,
    lessonId: string,
    data: {
      status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED'
      timeSpent?: number
      confidence?: number
    }
  ) {
    return prisma.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        ...data,
        updatedAt: new Date(),
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
      create: {
        userId,
        lessonId,
        status: data.status || 'IN_PROGRESS',
        timeSpent: data.timeSpent || 0,
        confidence: data.confidence || 3,
        startedAt: new Date(),
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
    })
  }

  /**
   * Get next lesson for user
   */
  static async getNextLesson(userId: string, courseSlug: string) {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                progress: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    })

    if (!course) return null

    // Find first incomplete lesson
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        const progress = lesson.progress[0]
        if (!progress || progress.status !== 'COMPLETED') {
          return {
            courseSlug,
            moduleSlug: module.slug,
            lessonSlug: lesson.slug,
            lesson,
          }
        }
      }
    }

    return null // All lessons completed
  }

  /**
   * Search lessons by content
   */
  static async searchLessons(query: string, courseSlug?: string) {
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (courseSlug) {
      const course = await prisma.course.findUnique({
        where: { slug: courseSlug },
      })
      
      if (course) {
        whereClause.module = {
          courseId: course.id,
        }
      }
    }

    return prisma.lesson.findMany({
      where: whereClause,
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
      take: 20,
    })
  }
}