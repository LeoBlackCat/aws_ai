const mongoose = require('mongoose');

// Definition Schema
const definitionSchema = new mongoose.Schema({
  concept: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  definition: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    file: {
      type: String,
      required: true,
      index: true
    },
    section: {
      type: String,
      required: true,
      index: true
    },
    section_type: {
      type: String,
      enum: ['header1', 'header2', 'header3'],
      default: 'header1'
    }
  },
  metadata: {
    batch_name: String,
    extraction_method: {
      type: String,
      default: 'gpt-5-mini'
    },
    prompt_tokens: Number,
    completion_tokens: Number,
    total_tokens: Number
  },
  extracted_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'definitions'
});

// Compound index for uniqueness
definitionSchema.index({ 
  concept: 1, 
  'source.file': 1, 
  'source.section': 1 
}, { 
  unique: true 
});

// Text search index
definitionSchema.index({
  concept: 'text',
  definition: 'text'
});

// Extraction Session Schema
const extractionSessionSchema = new mongoose.Schema({
  session_name: {
    type: String,
    required: true,
    unique: true
  },
  session_directory: String,
  source_file: String,
  total_concepts: Number,
  successful_extractions: Number,
  failed_extractions: Number,
  total_tokens_used: Number,
  average_tokens_per_request: Number,
  started_at: {
    type: Date,
    default: Date.now
  },
  completed_at: Date,
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running'
  }
}, {
  timestamps: true,
  collection: 'extraction_sessions'
});

const Definition = mongoose.model('Definition', definitionSchema);
const ExtractionSession = mongoose.model('ExtractionSession', extractionSessionSchema);

module.exports = {
  Definition,
  ExtractionSession,
  mongoose
};