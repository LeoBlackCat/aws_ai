import { prisma } from '../lib/prisma'
import { UserService, CourseService } from '../lib/database'

describe('Database Setup', () => {
  beforeAll(async () => {
    // Ensure database connection is working
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Course Service', () => {
    it('should fetch all courses', async () => {
      const courses = await CourseService.getAllCourses()
      expect(courses).toBeDefined()
      expect(Array.isArray(courses)).toBe(true)
      
      if (courses.length > 0) {
        const course = courses[0]
        expect(course).toHaveProperty('id')
        expect(course).toHaveProperty('title')
        expect(course).toHaveProperty('modules')
        expect(Array.isArray(course.modules)).toBe(true)
      }
    })

    it('should fetch AWS AI Practitioner course by slug', async () => {
      const course = await CourseService.getCourseBySlug('aws-ai-practitioner')
      expect(course).toBeDefined()
      
      if (course) {
        expect(course.title).toBe('AWS Artificial Intelligence Practitioner')
        expect(course.modules.length).toBeGreaterThan(0)
        
        // Check if modules have lessons
        const moduleWithLessons = course.modules.find(m => m.lessons.length > 0)
        expect(moduleWithLessons).toBeDefined()
      }
    })
  })

  describe('User Service', () => {
    const testEmail = 'test@example.com'
    const testPassword = 'testpassword123'
    let testUserId: string

    afterEach(async () => {
      // Clean up test user if created
      if (testUserId) {
        try {
          await prisma.user.delete({ where: { id: testUserId } })
        } catch (error) {
          // User might not exist, ignore error
        }
      }
    })

    it('should create a new user', async () => {
      const user = await UserService.createUser({
        email: testEmail,
        password: testPassword,
        name: 'Test User',
      })

      testUserId = user.id
      
      expect(user).toBeDefined()
      expect(user.email).toBe(testEmail)
      expect(user.name).toBe('Test User')
      expect(user.password).toBeDefined()
      expect(user.password).not.toBe(testPassword) // Should be hashed
    })

    it('should authenticate user with correct credentials', async () => {
      // Create user first
      const createdUser = await UserService.createUser({
        email: testEmail,
        password: testPassword,
      })
      testUserId = createdUser.id

      // Test authentication
      const authenticatedUser = await UserService.authenticate(testEmail, testPassword)
      expect(authenticatedUser).toBeDefined()
      expect(authenticatedUser?.id).toBe(createdUser.id)
    })

    it('should not authenticate user with incorrect credentials', async () => {
      // Create user first
      const createdUser = await UserService.createUser({
        email: testEmail,
        password: testPassword,
      })
      testUserId = createdUser.id

      // Test with wrong password
      const authenticatedUser = await UserService.authenticate(testEmail, 'wrongpassword')
      expect(authenticatedUser).toBeNull()
    })
  })

  describe('Database Schema', () => {
    it('should have seeded data', async () => {
      const courseCount = await prisma.course.count()
      const moduleCount = await prisma.module.count()
      const lessonCount = await prisma.lesson.count()
      const awsServiceCount = await prisma.aWSService.count()
      const termCount = await prisma.term.count()
      const achievementCount = await prisma.achievement.count()

      expect(courseCount).toBeGreaterThan(0)
      expect(moduleCount).toBeGreaterThan(0)
      expect(lessonCount).toBeGreaterThan(0)
      expect(awsServiceCount).toBeGreaterThan(0)
      expect(termCount).toBeGreaterThan(0)
      expect(achievementCount).toBeGreaterThan(0)
    })

    it('should have proper relationships', async () => {
      const course = await prisma.course.findFirst({
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      })

      expect(course).toBeDefined()
      if (course) {
        expect(course.modules.length).toBeGreaterThan(0)
        
        const moduleWithLessons = course.modules.find(m => m.lessons.length > 0)
        expect(moduleWithLessons).toBeDefined()
        
        if (moduleWithLessons) {
          expect(moduleWithLessons.lessons[0].moduleId).toBe(moduleWithLessons.id)
        }
      }
    })
  })
})