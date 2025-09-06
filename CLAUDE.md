# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is educational content in markdown files and some sandbox applications to parse it.

Please use when needed gpt-5 and following models:
- 'gpt-5' for complex tasks with reasoning (the most expensive one)
- 'gpt-5-mini' or 'gpt-5-nano' (the cheapest one) for easier tasks

API key is in .env file.

## GPT-5 vs GPT-4 api differences

1. Removed parameters: GPT-5 family models no longer support temperature, top-p, logprobs, top-k, stop sequences, logit bias, or custom system prompts. Attempting to set them results in an error—you must use defaults instead. 
2. New control parameters: GPT-5 introduces things like “verbosity”, “reasoning_effort”, chain-of-thought handoff, output constraints, and more nuanced prompt tuning options. 

3. Extended context window: GPT-5 models support massive context—hundreds of thousands of tokens, far beyond GPT-4. 

4. Unified routing system: Instead of manually selecting between variants, GPT-5’s backend dynamically routes requests between fast or “thinking” sub-models based on task complexity. 

### GPT-5 (flagship)
```json
{
  "model": "gpt-5",
  "prompt": "/// your prompt here",
  "max_completion_tokens": 500,
}
```

### GPT-5 mini
```json
{
  "model": "gpt-5-mini",
  "prompt": "...",
  "max_completion_tokens": 300,
}
```

### GPT-5 nano
```json
{
  "model": "gpt-5-nano",
  "prompt": "...",
  "max_completion_tokens": 200,
}
```

## Development Commands

```bash
# Development
npm start                    # Start dev server on port 3000 with hot reload
npm run build               # Production build with optimizations
npm run build:gh-pages      # GitHub Pages specific build

# Testing and Quality
npm test                    # Run Jest tests
npm run test:watch          # Run tests in watch mode
npm run lint               # ESLint code analysis

# Deployment
npm run deploy             # Deploy to GitHub Pages (LeoBlackCat.github.io/aws_ai)
```

## Architecture

**Sanbox app**
- `src/components/` - React components with specific responsibilities:
  - `QuestionDisplay.js` - Question presentation and voice playback
  - `AnswerEvaluator.js` - Response evaluation with OpenAI integration
  - `FeedbackSystem.js` - User feedback and improvement suggestions
  - `ProgressTracker.js` - Session analytics and scoring
  - `APIUsageTracker.js` - OpenAI usage monitoring
  - `SettingsModal.js` - Configuration management
- `src/services/` - Business logic layer for content processing and AI operations
- `src/hooks/` - Custom React hooks for shared stateful logic

**Data Architecture:**
- `data/` directory contains educational markdown files organized by AWS AI topics
- Frontend-only architecture - no backend dependencies
- User-provided OpenAI API keys stored in browser local storage
- Content loaded dynamically from static markdown files

**Educational Workflow:**
1. Parse markdown files for definitions and concepts
2. Generate questions using OpenAI API or predefined sets
3. Capture user responses via Web Speech API
4. Evaluate responses using OpenAI's semantic similarity
5. Provide immediate feedback with improvement suggestions
6. Track progress and API usage



## Content Management

Educational content is stored as markdown files in topic-specific directories:
- `fundamentals/` - ML/AI fundamentals
- `ai_usecases/` - AI applications
- `responsible_ai_practices/` - Responsible AI
- `developing_ml/` - ML development lifecycle
- `developing_genai/` - Generative AI development
- `optimizing_fm/` - Foundation model optimization
- `security_compliance_governance/` - AI security and governance
- `prompt_engineering/` - Prompt engineering essentials

Python scripts in the root handle definition extraction and validation from educational content.

