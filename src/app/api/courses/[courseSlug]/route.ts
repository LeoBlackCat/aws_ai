import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseSlug: string } }
) {
  try {
    const course = await CourseService.getCourseBySlug(params.courseSlug)
    
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