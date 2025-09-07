import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer'
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid'

export default function Home() {
  return (
    <MobileLayout currentTab="home">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ResponsiveContainer padding="md" className="flex h-14 items-center">
          <div className="mr-4 flex">
            <h1 className="text-lg font-semibold">AWS AI Trainer</h1>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Badge variant="secondary">Beta</Badge>
          </div>
        </ResponsiveContainer>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <ResponsiveContainer padding="md" className="py-6">
        <div className="flex flex-col space-y-6">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Master AWS AI Concepts
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Interactive learning platform for AWS AI Practitioner certification preparation 
              with quizzes, flashcards, and AI tutoring.
            </p>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>
                Track your learning journey across all AWS AI modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Lessons Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Quiz Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <ResponsiveGrid 
            cols={{ default: 1, md: 2, lg: 3 }}
            gap="md"
          >
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Start Learning</CardTitle>
                <CardDescription>
                  Begin with AWS AI fundamentals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Begin Course
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Practice Quiz</CardTitle>
                <CardDescription>
                  Test your knowledge with AI-generated questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Take Quiz
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Flashcards</CardTitle>
                <CardDescription>
                  Review AWS services with spaced repetition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Review Cards
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Audio Content</CardTitle>
                <CardDescription>
                  Listen to lesson summaries and daily recaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/audio-demo">Try Audio Demo</a>
                </Button>
              </CardContent>
            </Card>
          </ResponsiveGrid>

          {/* Course Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
              <CardDescription>
                Comprehensive AWS AI Practitioner curriculum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'AI Fundamentals',
                  'AWS AI Services',
                  'Machine Learning Basics',
                  'Developing with GenAI',
                  'Responsible AI Practices',
                  'Security & Compliance'
                ].map((module, index) => (
                  <div key={module} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{module}</span>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </ResponsiveContainer>
      </main>
    </MobileLayout>
  )
}
