import { prisma } from '../prisma'
import { hashPassword, verifyPassword } from '../auth'
import type { User, UserWithProfile } from '../../types/database'

export class UserService {
  /**
   * Create a new user with email and password
   */
  static async createUser(data: {
    email: string
    password: string
    name?: string
  }): Promise<User> {
    const hashedPassword = await hashPassword(data.password)
    
    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    })
  }

  /**
   * Create a user via OAuth
   */
  static async createOAuthUser(data: {
    email: string
    name?: string
    provider: string
    providerId: string
    avatar?: string
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        provider: data.provider,
        providerId: data.providerId,
        avatar: data.avatar,
      },
    })
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  /**
   * Find user by ID with profile data
   */
  static async findByIdWithProfile(userId: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: {
          include: {
            lesson: {
              include: {
                module: true,
              },
            },
          },
        },
        achievements: {
          include: {
            achievement: true,
          },
        },
        sessions: {
          orderBy: {
            startTime: 'desc',
          },
          take: 10,
        },
      },
    }) as Promise<UserWithProfile | null>
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticate(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      return null
    }

    const isValid = await verifyPassword(password, user.password)
    return isValid ? user : null
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: {
    name?: string
    avatar?: string
    preferences?: any
  }): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data,
    })
  }

  /**
   * Update user XP and level
   */
  static async addXP(userId: string, xp: number): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const newTotalXP = user.totalXP + xp
    const newLevel = Math.floor(newTotalXP / 1000) + 1 // 1000 XP per level

    return prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: newTotalXP,
        level: newLevel,
      },
    })
  }

  /**
   * Update user streak
   */
  static async updateStreak(userId: string, increment: boolean = true): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const newStreak = increment ? user.currentStreak + 1 : 0
    const longestStreak = Math.max(user.longestStreak, newStreak)

    return prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastLoginAt: new Date(),
      },
    })
  }

  /**
   * Get user learning analytics
   */
  static async getLearningAnalytics(userId: string) {
    const [
      progressStats,
      quizStats,
      cardStats,
      recentSessions,
    ] = await Promise.all([
      // Progress statistics
      prisma.userProgress.aggregate({
        where: { userId },
        _sum: { timeSpent: true },
        _count: { id: true },
      }),
      
      // Quiz statistics
      prisma.quizAttempt.aggregate({
        where: { userId },
        _avg: { score: true },
        _count: { id: true },
      }),
      
      // Card review statistics
      prisma.cardReview.aggregate({
        where: { userId },
        _count: { id: true },
      }),
      
      // Recent learning sessions
      prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        take: 30,
      }),
    ])

    return {
      totalTimeSpent: progressStats._sum.timeSpent || 0,
      lessonsCompleted: progressStats._count || 0,
      quizzesTaken: quizStats._count || 0,
      averageScore: quizStats._avg.score || 0,
      cardsReviewed: cardStats._count || 0,
      recentSessions,
    }
  }
}