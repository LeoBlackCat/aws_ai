import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseSlug: string }> }
) {
  const { courseSlug } = await params
  try {
    const course = await CourseService.getCourseBySlug(courseSlug)
    
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: course,
    })
  } catch (error) {
    console.error('Error fetching course:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch course',
      },
      { status: 500 }
    )
  }
}