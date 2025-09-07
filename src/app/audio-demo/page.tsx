'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AudioManager from '@/components/audio/AudioManager';

const sampleLessonContent = `
# AWS AI Services Overview

Amazon Web Services provides a comprehensive suite of artificial intelligence and machine learning services that enable developers to build intelligent applications without requiring deep expertise in AI/ML.

## Key AWS AI Services

### Amazon Bedrock
Amazon Bedrock is a fully managed service that offers a choice of high-performing foundation models (FMs) from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Stability AI, and Amazon via a single API. With Bedrock, you can:

- Access foundation models through a unified API
- Customize models with your own data using techniques like fine-tuning and Retrieval Augmented Generation (RAG)
- Build agents that execute complex business tasks
- Maintain data privacy and security

### Amazon SageMaker
Amazon SageMaker is a fully managed machine learning service that enables developers and data scientists to build, train, and deploy ML models quickly. Key features include:

- **SageMaker Studio**: An integrated development environment for ML
- **SageMaker Autopilot**: Automated machine learning capabilities
- **SageMaker Ground Truth**: Data labeling service
- **SageMaker Model Registry**: Centralized model repository

### Amazon Comprehend
Amazon Comprehend is a natural language processing (NLP) service that uses machine learning to find insights and relationships in text. It can:

- Extract key phrases, entities, and sentiment from text
- Analyze documents for personally identifiable information (PII)
- Create custom entity recognition models
- Perform topic modeling and document classification

## Use Cases

These AWS AI services enable various use cases:

1. **Content Generation**: Use Bedrock to generate marketing copy, documentation, and creative content
2. **Customer Service**: Implement intelligent chatbots and sentiment analysis
3. **Document Processing**: Extract insights from large volumes of documents
4. **Predictive Analytics**: Build models to forecast business outcomes
5. **Personalization**: Create recommendation systems for e-commerce and content platforms

## Best Practices

When implementing AWS AI services:

- Start with pre-trained models before building custom solutions
- Implement proper data governance and privacy controls
- Monitor model performance and bias regularly
- Use AWS security best practices for AI workloads
- Consider cost optimization strategies for large-scale deployments

This overview provides the foundation for understanding how AWS AI services can transform your applications and business processes.
`;

export default function AudioDemoPage() {
  const [selectedDemo, setSelectedDemo] = useState<'lesson' | 'recap' | null>(null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Audio Content System Demo
        </h1>
        <p className="text-lg text-gray-600">
          Experience the text-to-speech functionality with lesson summaries and daily recaps.
        </p>
      </div>

      {/* Demo Selection */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Choose a Demo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => setSelectedDemo('lesson')}
            variant={selectedDemo === 'lesson' ? 'default' : 'outline'}
            className="h-auto p-4 text-left"
          >
            <div>
              <div className="font-semibold">Lesson Audio Summary</div>
              <div className="text-sm text-gray-600 mt-1">
                Generate audio summary from lesson content
              </div>
            </div>
          </Button>
          
          <Button
            onClick={() => setSelectedDemo('recap')}
            variant={selectedDemo === 'recap' ? 'default' : 'outline'}
            className="h-auto p-4 text-left"
          >
            <div>
              <div className="font-semibold">Daily Learning Recap</div>
              <div className="text-sm text-gray-600 mt-1">
                Generate personalized daily progress recap
              </div>
            </div>
          </Button>
        </div>
      </Card>

      {/* Audio Manager */}
      {selectedDemo && (
        <AudioManager
          lessonId={selectedDemo === 'lesson' ? 'demo-lesson-1' : undefined}
          lessonTitle={selectedDemo === 'lesson' ? 'AWS AI Services Overview' : undefined}
          lessonContent={selectedDemo === 'lesson' ? sampleLessonContent : undefined}
          userId={selectedDemo === 'recap' ? 'demo-user-1' : undefined}
        />
      )}

      {/* Sample Content Display */}
      {selectedDemo === 'lesson' && (
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Sample Lesson Content</h3>
          <div className="prose max-w-none">
            <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
              {sampleLessonContent}
            </div>
          </div>
        </Card>
      )}

      {selectedDemo === 'recap' && (
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Sample Learning Progress</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Lessons Completed Today</h4>
              <ul className="list-disc list-inside text-gray-600 mt-1">
                <li>AWS AI Services Overview</li>
                <li>Amazon Bedrock Fundamentals</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Quiz Scores</h4>
              <ul className="list-disc list-inside text-gray-600 mt-1">
                <li>AWS AI Services Overview: 85%</li>
                <li>Amazon Bedrock Fundamentals: 92%</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">New Concepts Learned</h4>
              <ul className="list-disc list-inside text-gray-600 mt-1">
                <li>Foundation Models</li>
                <li>Retrieval Augmented Generation (RAG)</li>
                <li>Amazon SageMaker Autopilot</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Items Due for Review</h4>
              <ul className="list-disc list-inside text-gray-600 mt-1">
                <li>EC2 instance types</li>
                <li>S3 storage classes</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Features Overview */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">TTS System Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🎙️ Audio Generation</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ElevenLabs high-quality TTS with natural voices</li>
              <li>• Multiple voice personalities and styles</li>
              <li>• Customizable speech parameters (speed, tone)</li>
              <li>• Background processing queue for efficiency</li>
              <li>• Podcast-style content generation</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🎵 Audio Player</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Background playback with media session API</li>
              <li>• Variable speed controls (0.5x - 2.0x)</li>
              <li>• Skip forward/backward (15s jumps)</li>
              <li>• Mini player for multitasking</li>
              <li>• Queue management and auto-play</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📚 Content Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Lesson summaries (2-10 minutes)</li>
              <li>• Daily learning recaps with progress</li>
              <li>• Weekly summary podcasts</li>
              <li>• Custom text-to-speech conversion</li>
              <li>• Motivational and encouraging content</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🚀 Smart Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic content summarization</li>
              <li>• Progress-based recap generation</li>
              <li>• Offline audio download support</li>
              <li>• Memory-efficient streaming</li>
              <li>• Push notifications for background play</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Technical Implementation */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">Technical Implementation</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Architecture Components</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Frontend:</strong>
                  <ul className="mt-1 text-gray-600">
                    <li>• React hooks for audio control</li>
                    <li>• Background audio service</li>
                    <li>• Media Session API integration</li>
                    <li>• Progressive Web App features</li>
                  </ul>
                </div>
                <div>
                  <strong>Backend:</strong>
                  <ul className="mt-1 text-gray-600">
                    <li>• ElevenLabs TTS integration</li>
                    <li>• Audio generation pipeline</li>
                    <li>• Queue management system</li>
                    <li>• Podcast content generator</li>
                  </ul>
                </div>
                <div>
                  <strong>Features:</strong>
                  <ul className="mt-1 text-gray-600">
                    <li>• Multiple voice options</li>
                    <li>• Background playback</li>
                    <li>• Speed controls</li>
                    <li>• Queue management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key Requirements Implemented</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-800 mb-1">✅ Requirement 6.1</h5>
                <p className="text-sm text-green-700">Generate 2-10 minute spoken summaries of lesson key points</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-800 mb-1">✅ Requirement 6.2</h5>
                <p className="text-sm text-green-700">Playback controls with speed adjustment (0.8x-1.5x) and progress tracking</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-800 mb-1">✅ Requirement 6.3</h5>
                <p className="text-sm text-green-700">Background playback with persistent mini-player</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-800 mb-1">✅ Requirement 20.3 & 23.1</h5>
                <p className="text-sm text-green-700">Daily podcast recap and multiple voice styles</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}