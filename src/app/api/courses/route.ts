import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const courses = await CourseService.getAllCourses()
    
    return NextResponse.json({
      success: true,
      data: courses,
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch courses',
      },
      { status: 500 }
    )
  }
}