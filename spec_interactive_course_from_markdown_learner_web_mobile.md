# Product Requirements & Technical Design Document

**Product name (working):** MarkLearn – “Learn anything from Markdown”  
**Owner:** Leo  
**Goal:** Convert a structured Markdown course (folders, interlinked `.md`, embedded images) into an interactive, mobile‑ready web app that generates quizzes, spaced‑repetition flashcards, mock exams, a tutor chat, and TTS “podcasts.”

---

## 1) Vision & Scope
**Vision:** One repo of Markdown → a complete self‑study experience: read → recall → test → retain → revisit.

**In‑scope (MVP):**
- Import local zip or Git repo of Markdown
- Render course as lessons/modules with images
- Automatic extraction of key terms/definitions
- Quiz generator (MCQ/short/cloze) per lesson
- Spaced repetition (Anki‑style) built‑in
- TTS audio for lesson summaries (download/stream)
- Progress tracking and basic analytics
- Mobile‑first PWA with offline reading & reviews

**Out‑of‑scope (MVP):** collaborative editing, grading by instructors, payments, multi‑tenant orgs (nice‑to‑have later).

---

## 2) Personas & Key User Stories
**Learner (solo):**
- *As a learner*, I can import a Markdown course and immediately read it on my phone.
- *As a learner*, I can generate flashcards and quizzes from any lesson and review them daily.
- *As a learner*, I can listen to a concise audio summary while commuting or at the gym.
- *As a learner*, I can chat with a tutor constrained to my course content (RAG) and practice active recall.
- *As a learner*, I can track progress, weak topics, and a review schedule.

**Creator (same person initially):**
- *As a creator*, I can configure parsing rules (frontmatter, headings) so terms/definitions are extracted correctly.
- *As a creator*, I can regen quizzes/TTS with adjustable difficulty and length.

---

## 3) Functional Requirements
### 3.1 Content Ingestion
- Accept sources: **Upload .zip**, **GitHub repo URL**, **local folder (desktop app helper optional; post‑MVP)**.
- Supported files: `.md`, `.mdx` (rendered as MD, no JSX), images (`.png/.jpg/.gif/.svg`), optional metadata (`manifest.json`, frontmatter YAML).
- Resolve relative links, image paths, anchors; produce canonical slugs.
- Extract structure: `Course → Module (folder) → Lesson (file)`.
- Parse frontmatter for `title`, `tags`, `level`, `prereqs`, `summary`.

### 3.2 Rendering & Navigation
- Lesson view with sticky TOC, footnotes, image lightbox, code blocks with copy.
- Cross‑links preserved; display “Referenced by” backlinks.
- Mobile gestures: swipe next/prev lesson; mini‑player for audio.

### 3.3 Knowledge Mining
- Term/definition extraction from:
  - Glossary tables
  - `**Term:** Definition` patterns
  - Headings like `## Key terms`, `### Definition`
  - Frontmatter `terms: [ {term, def} ]`
- Concept mapping: identify entities, key facts, and learning objectives per lesson.

### 3.4 Quiz & Exam Generation
- Per‑lesson and per‑module **question bank**:
  - Types: MCQ (1 correct, 3 distractors), multi‑select, short answer, **cloze deletion**.
  - Difficulty tiers (Easy/Medium/Hard) and competencies (recall/understanding/apply).
  - Constraints: factual grounding to the ingested text; include citeable paragraph ID.
- **Exam builder:** mix of question types; timed; score + review with rationales.

### 3.5 Spaced Repetition (SRS)
- Built‑in SM‑2 style algorithm with 1–5 ease ratings.
- Card types: Basic (Q/A), Cloze, Image occlusion (for labeled diagrams via SVG rectangles).
- Daily review queue; streaks; deck export/import **.apkg (post‑MVP)**.

### 3.6 Tutor Chat (RAG)
- Chat limited to course content; references returned as paragraph/heading anchors.
- Modes: **Socratic** (asks you), **Answer** (you ask), **Drill** (rapid‑fire).
- Guardrails: refuse to hallucinate beyond corpus; show sources.

### 3.7 TTS “Podcast”
- Auto‑summaries per lesson (bullet → script) with adjustable length (2/5/10 min).
- Voices: cloud TTS (pluggable: ElevenLabs, Azure, local Coqui‑TTS).
- Playlist by module; background playback in PWA.

### 3.8 Progress & Analytics
- Lesson completion, time on task, quiz accuracy by tag/topic, leech cards.
- Heatmap of mastery; recommendations for next review.

### 3.9 Internationalization & Accessibility
- i18n for UI; bidirectional text (Arabic) support.
- WCAG 2.2 AA: color contrast, keyboard nav, captions/transcripts for TTS.

---

## 4) Non‑Functional Requirements
- **Performance:** TTI < 2.5s on mid‑range Android over 4G; Lighthouse ≥ 90.
- **Privacy:** All processing can run server‑side with option for local‑only (desktop helper, post‑MVP). PII‑free by default.
- **Scalability:** 100k tokens per lesson chunking supported; vector index up to 1M chunks.
- **Reliability:** 99.9% uptime; background jobs idempotent; retry with exponential backoff.
- **Security:** Auth (email/pass + OAuth), JWT, signed URLs for media; per‑project ACL.

---

## 5) Information Architecture & Data Model
### 5.1 Content Model (logical)
- **Course** { id, title, description, tags[], defaultLanguage }
- **Module** { id, courseId, title, order }
- **Lesson** { id, moduleId, slug, title, html, rawMd, frontmatter, anchors[], images[] }
- **Resource** { id, lessonId, type(image|audio|file), url, alt }
- **Term** { id, lessonId, term, definition, sourceAnchorId }
- **Question** { id, lessonId, type, stem, choices[], answer, rationale, anchors[] , difficulty}
- **Card** { id, lessonId, type(basic|cloze|imageOcc), front, back, clozeMask[], imageRegions[] }
- **User** { id, email, name }
- **Progress** { id, userId, lessonId, completedAt, seconds }
- **ReviewLog** { id, userId, cardId, ease(1–5), nextReviewAt, interval, lapses }
- **AudioAsset** { id, lessonId, kind(summary|podcast), duration, url }

### 5.2 Storage
- **DB:** Postgres (relational), Prisma ORM.
- **Search/RAG:** Vector DB (pgvector or Qdrant) with chunk metadata {courseId, lessonId, anchorId}.
- **Object store:** S3‑compatible (images, audio, exported decks).

---

## 6) Content Conventions & Manifest
### 6.1 Frontmatter (per lesson)
```yaml
---
title: "Lesson 02 – Linear Models"
tags: [ai, ml, regression]
level: beginner
summary: "Intro to linear regression and loss functions"
objectives:
  - "Define hypothesis h(x) for linear regression"
  - "Explain MSE loss"
terms:
  - term: "Mean Squared Error"
    def: "Average of squared differences between predictions and targets."
---
```

### 6.2 Course Manifest (optional)
`manifest.json`
```json
{
  "title": "Fundamentals of AI",
  "modules": [
    { "slug": "intro", "title": "Introduction", "order": 1 },
    { "slug": "linear-models", "title": "Linear Models", "order": 2 }
  ],
  "settings": {
    "quiz": { "defaultCount": 12 },
    "tts": { "length": "short" },
    "srs": { "dailyNew": 20 }
  }
}
```

---

## 7) System Architecture
**Frontend:** Next.js (React, TypeScript), Tailwind, shadcn/ui, PWA, Service Worker.  
**Backend:** Node.js (NestJS) or FastAPI; job queue (BullMQ or Celery).  
**Services:**
- Parser service (Markdown → HTML, anchors, images) using unified/remark/rehype
- Miner service (terms, objectives, question candidates)
- LLM service (prompted generation; provider‑agnostic)
- Vector indexer (chunking + embedding)
- TTS service (adapter pattern)

**High‑level flow:**
1) Upload/import repo → 2) Parse MD → 3) Mine terms → 4) Chunk + embed → 5) Generate questions/cards/TTS → 6) Store & expose via API → 7) UI renders lessons/quizzes/SRS.

---

## 8) APIs (REST, versioned `/v1`)
### 8.1 Ingestion
- `POST /v1/projects` {name} → {projectId}
- `POST /v1/projects/{id}/import` (zip or repoUrl)
- `POST /v1/projects/{id}/reindex` (optional flags: parseOnly|miningOnly)

### 8.2 Content
- `GET /v1/courses/{id}`
- `GET /v1/courses/{id}/modules`
- `GET /v1/lessons/{id}` → {html, anchors, images, terms}

### 8.3 Assessment
- `POST /v1/quiz/generate` {scope: lessonId|moduleId, types[], count, difficulty}
- `POST /v1/exam/generate` {moduleId, mix, duration}
- `POST /v1/quiz/grade` {quizId, answers[]} → score, review

### 8.4 SRS
- `GET /v1/srs/today` → cards[]
- `POST /v1/srs/review` {cardId, ease(1–5)} → schedule update
- `POST /v1/cards/generate` {lessonId, types[]}

### 8.5 Tutor (RAG)
- `POST /v1/chat` {projectId, mode, message} → {reply, citations[]}

### 8.6 TTS
- `POST /v1/tts/generate` {lessonId, length, voice} → {audioAssetId}
- `GET /v1/tts/{audioAssetId}` → stream

### 8.7 Auth & Users
- `POST /v1/auth/login`, `POST /v1/auth/register`
- `GET /v1/me`, `GET /v1/me/progress`

---

## 9) Generation Prompts (LLM‑side)
### 9.1 Quiz (MCQ)
```
SYSTEM: You generate factual, corpus‑grounded questions. Cite paragraph anchors.
USER: From the provided lesson chunks, create {count} MCQs. Constraints:
- 1 correct, 3 plausible distractors.
- No trivia beyond the corpus.
- Include fields: stem, choices[], answerIndex, rationale, anchors[]
CHUNKS: <chunked text with [L1], [L2] anchors>
```

### 9.2 Cloze Cards
```
SYSTEM: Produce cloze deletions that test key facts. One fact per card.
USER: From the lesson objectives and key terms, create {count} cloze cards.
Output JSON: {textWithCloze, sourceAnchorId}
```

### 9.3 Tutor (Socratic Mode)
```
SYSTEM: Ask the learner one question at a time from the corpus; wait for response; assess; explain; follow up.
USER: Drill me on {lesson/module}. Use only content from citations. Provide anchor IDs every turn.
```

### 9.4 TTS Script
```
SYSTEM: Write a concise audio script in plain language.
USER: Summarize the lesson into a {2|5|10}-minute script with intro, 3–5 bullet sections, and recap. Avoid lists of numbers longer than 5 items.
```

---

## 10) Chunking & Embeddings
- Chunk by heading + token length (e.g., 800 tokens with 15% overlap).
- Metadata: {courseId, moduleId, lessonId, anchorId, headingPath}
- Embeddings: provider‑pluggable; store vector + metadata in Qdrant/pgvector.
- Retrieval: hybrid (BM25 + vector kNN) with reranking; top‑k=8.

---

## 11) SRS Algorithm (SM‑2 variant)
```
if ease < 3: interval = 1; lapses++
else if firstReview: interval = 1
else if secondReview: interval = 6
else: interval = round(prevInterval * (1 + (ease-3)*0.15) * easeFactor)
nextReviewAt = now + interval days
```
- Ease factor min 1.3, max 2.8; default 2.5.
- Daily cap: newCards = settings.dailyNew (default 20).

---

## 12) UI/UX (Mobile‑first)
- **Home:** Continue learning, Today’s reviews, Resume last lesson.
- **Lesson:** sticky TOC; “Generate quiz”, “Add cards”, “Make audio”. Citations open inline footnotes.
- **Quiz:** one‑question per screen; large tap targets; progress bar; review screen with explanations.
- **SRS:** swipe‑based ease buttons (Again/Hard/Good/Easy). Offline queue.
- **Chat:** messages with inline citations; “Show paragraph” panel.
- **Audio:** mini player persistent footer; background playback; variable speed 0.8–1.5x.

**Design system:** Tailwind + shadcn/ui, light/dark, 12‑column grid ≥md, 4‑pt spacing, WCAG AA colors.

---

## 13) PWA & Offline Behavior
- Cache lesson HTML, images, CSS/JS via Workbox strategies.
- Background sync for SRS review logs; optimistic UI.
- Store quizzes in IndexedDB; sync on reconnect.

---

## 14) Deployment & DevOps
- **Frontend:** Next.js on Vercel (SSR for SEO + static for lessons).
- **Backend:** NestJS on Fly.io/Render; Postgres (Neon), Qdrant managed or pgvector on Neon.
- **Assets:** S3 (Backblaze/MinIO). CDN via Cloudflare.
- **Jobs:** BullMQ on Redis (Upstash) for generation/TTS.
- **Secrets:** 12‑factor; per‑project provider keys.

---

## 15) Security & Privacy
- JWT auth; rotating refresh tokens; HTTPS only; CORS locked to app domain.
- Signed URLs for private assets; per‑project RBAC (owner, reader).
- “Local‑only” mode later: desktop helper to parse & serve on localhost.

---

## 16) Analytics & Telemetry (privacy‑respecting)
- Count of generated items; success/error; quiz accuracy by tag; SRS retention.
- Toggleable telemetry; no raw content sent to analytics.

---

## 17) Testing Strategy
- **Unit:** parser (frontmatter, link resolution), miner (term patterns), scheduler.
- **Contract tests:** API schemas with zod/openapi.
- **E2E:** Cypress flows: import → lesson → generate quiz → review SRS → TTS playback.
- **Content QA:** hallucination guard—LLM answers must include anchor ids; reject otherwise.

---

## 18) Implementation Roadmap
**Milestone 1 (2–3 weeks):** Import, parse, render lessons; slugs; TOC; basic navigation.  
**Milestone 2 (2–3 weeks):** Quiz generation + grading; question bank per lesson.  
**Milestone 3 (2–3 weeks):** SRS core + mobile PWA + offline reviews.  
**Milestone 4 (2 weeks):** Tutor RAG with citations; TTS summaries.  
**Milestone 5 (ongoing):** Analytics, image occlusion, Anki export, i18n.

---

## 19) Repository Structure
```
marklearn/
  apps/
    web/              # Next.js app
    api/              # NestJS service
  packages/
    parser/           # Markdown → HTML + anchors
    miner/            # term mining, objectives, question candidates
    srs/              # scheduling lib
    prompts/          # LLM prompt templates
    ui/               # shared components
  infra/              # IaC (Terraform) & Docker
  docs/               # ADRs, OpenAPI
```

---

## 20) OpenAPI (excerpt)
```yaml
openapi: 3.0.3
info:
  title: MarkLearn API
  version: 1.0.0
paths:
  /v1/quiz/generate:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                scope: { type: string }
                types: { type: array, items: { type: string } }
                count: { type: integer, minimum: 1, maximum: 50 }
                difficulty: { type: string, enum: [easy, medium, hard] }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/Question'
components:
  schemas:
    Question:
      type: object
      properties:
        id: { type: string }
        type: { type: string }
        stem: { type: string }
        choices: { type: array, items: { type: string } }
        answerIndex: { type: integer }
        rationale: { type: string }
        anchors: { type: array, items: { type: string } }
```

---

## 21) Example Miner Rules
- **Definition lines:** `/^\*\*(.+?)\*\*\s*:\s*(.+)$/` → Term/Definition
- **Glossary tables:** markdown table with headers matching `/term|definition/i`
- **Objectives:** look for headings `Objectives`, `Learning goals`, `Outcomes` and bullet lists underneath.

---

## 22) Acceptance Criteria (MVP)
- Upload a sample Markdown course and see a navigable lesson tree.
- Generate 12 MCQs from a lesson and take a quiz on mobile (≤3 taps per Q, accessible).
- Create 20 cloze cards; complete daily SRS; next‑day scheduling works.
- Generate a 5‑minute audio summary and play it in‑app.
- Chat tutor answers a question with at least one citation link to source paragraph.

---

## 23) Stretch Goals
- Image occlusion editor (tap to hide labels).
- Hand‑drawn diagram scanner → automatic occlusion regions.
- “Study plan” generator by deadline + calendar export (ICS).
- Multiplayer quiz mode (Kahoot‑style) over WebRTC.

---

## 24) Risks & Mitigations
- **Hallucinations:** enforce citations + unit tests on generation; reject answers without anchors.
- **Parsing edge cases:** fallback to pure Markdown rendering when frontmatter missing.
- **Mobile performance:** precompute question banks; lazy‑load images; use low‑res placeholders.
- **TTS cost:** cache audio; per‑project quota; local TTS option.

---

## 25) Demo Checklist
- Import → parsed tree visible
- Open lesson → TOC + images
- “Generate quiz” → 10 MCQs → grading
- “Add cards” → review queue → ease buttons
- “Make audio” → 5‑min summary plays
- Tutor Q&A with citations and “show paragraph” popover

