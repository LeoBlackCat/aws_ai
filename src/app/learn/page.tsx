'use client'

import React from 'react'
import { LessonLayout } from '@/components/layout/LessonLayout'
import { AdaptiveImage } from '@/components/ui/AdaptiveImage'

const sampleCrossReferences = [
  {
    id: '1',
    title: 'Machine Learning Fundamentals',
    href: '/learn/ml-fundamentals',
    type: 'internal' as const,
    description: 'Learn the basics of machine learning concepts and algorithms',
    module: 'Fundamentals'
  },
  {
    id: '2',
    title: 'AWS SageMaker Overview',
    href: '/learn/sagemaker',
    type: 'internal' as const,
    description: 'Comprehensive guide to AWS SageMaker services',
    module: 'AWS Services'
  },
  {
    id: '3',
    title: 'AWS AI Services Documentation',
    href: 'https://docs.aws.amazon.com/ai/',
    type: 'external' as const,
    description: 'Official AWS documentation for AI services'
  }
]

export default function LearnPage() {
  const handlePreviousLesson = () => {
    console.log('Navigate to previous lesson')
  }

  const handleNextLesson = () => {
    console.log('Navigate to next lesson')
  }

  return (
    <LessonLayout
      title="Introduction to AWS AI Services"
      crossReferences={sampleCrossReferences}
      onPreviousLesson={handlePreviousLesson}
      onNextLesson={handleNextLesson}
      previousLessonTitle="AI Fundamentals Overview"
      nextLessonTitle="Machine Learning on AWS"
      enableSwipeNavigation={true}
    >
      <div className="space-y-6">
        <section>
          <h2 id="overview">Overview</h2>
          <p className="text-muted-foreground">
            Amazon Web Services (AWS) provides a comprehensive suite of artificial intelligence (AI) 
            and machine learning (ML) services that enable developers and data scientists to build 
            intelligent applications quickly and easily.
          </p>
        </section>

        <section>
          <h2 id="key-services">Key AWS AI Services</h2>
          <p>
            AWS offers AI services across multiple categories, each designed to solve specific 
            business challenges and use cases.
          </p>

          <h3 id="machine-learning">Machine Learning Services</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Amazon SageMaker:</strong> Fully managed service for building, training, and deploying ML models</li>
            <li><strong>Amazon Comprehend:</strong> Natural language processing service</li>
            <li><strong>Amazon Rekognition:</strong> Image and video analysis service</li>
            <li><strong>Amazon Textract:</strong> Document analysis and data extraction</li>
          </ul>
        </section>

        <section>
          <h2 id="architecture">AWS AI Architecture</h2>
          <p>
            The following diagram shows how AWS AI services integrate into a typical 
            machine learning workflow:
          </p>
          
          <AdaptiveImage
            src="/api/placeholder/800/400"
            alt="AWS AI Services Architecture Diagram showing the flow from data ingestion through model training to deployment"
            caption="AWS AI Services Architecture Overview"
            className="my-6"
          />
        </section>

        <section>
          <h2 id="getting-started">Getting Started</h2>
          <p>
            To begin using AWS AI services, you&apos;ll need to understand the fundamental concepts 
            and choose the right services for your use case.
          </p>

          <h3 id="prerequisites">Prerequisites</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>AWS Account with appropriate permissions</li>
            <li>Basic understanding of machine learning concepts</li>
            <li>Familiarity with AWS console and CLI</li>
          </ul>

          <h3 id="first-steps">First Steps</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Set up your AWS environment and permissions</li>
            <li>Choose the appropriate AI service for your use case</li>
            <li>Prepare and upload your training data</li>
            <li>Configure and train your model</li>
            <li>Deploy and monitor your model in production</li>
          </ol>
        </section>

        <section>
          <h2 id="best-practices">Best Practices</h2>
          <p>
            When working with AWS AI services, following these best practices will help ensure 
            successful implementations:
          </p>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Security & Compliance</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Use IAM roles and policies for fine-grained access control</li>
              <li>Enable encryption for data at rest and in transit</li>
              <li>Implement proper data governance and compliance measures</li>
            </ul>
          </div>
        </section>
      </div>
    </LessonLayout>
  )
}