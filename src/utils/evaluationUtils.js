import { evaluateAnswer, getEmbedding, calculateCosineSimilarity } from './openaiHelper';

// Enhanced evaluation system combining multiple approaches
export class AdvancedEvaluator {
  constructor() {
    this.keywordWeights = {
      critical: 0.4,    // Must-have terms
      important: 0.3,   // Should-have terms  
      supporting: 0.2,  // Good-to-have terms
      context: 0.1      // Background terms
    };
  }

  // Main evaluation function
  async evaluateAnswer(userAnswer, expectedAnswer, question, options = {}) {
    const results = await Promise.allSettled([
      this.semanticEvaluation(userAnswer, expectedAnswer),
      this.keywordEvaluation(userAnswer, expectedAnswer),
      this.structureEvaluation(userAnswer, expectedAnswer),
      this.completenessEvaluation(userAnswer, expectedAnswer)
    ]);

    const scores = results.map(result => 
      result.status === 'fulfilled' ? result.value : { score: 0, feedback: 'Evaluation failed' }
    );

    const [semantic, keyword, structure, completeness] = scores;

    // Weighted final score
    const finalScore = Math.round(
      semantic.score * 0.4 +
      keyword.score * 0.3 +
      structure.score * 0.15 +
      completeness.score * 0.15
    );

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      isCorrect: finalScore >= (options.threshold || 70),
      feedback: this.generateFeedback(finalScore, scores),
      similarities: this.extractSimilarities(scores),
      missingConcepts: this.extractMissingConcepts(scores),
      suggestions: this.generateSuggestions(scores),
      breakdown: {
        semantic: semantic.score,
        keyword: keyword.score,
        structure: structure.score,
        completeness: completeness.score
      },
      confidence: this.calculateConfidence(scores)
    };
  }

  // Semantic similarity using embeddings
  async semanticEvaluation(userAnswer, expectedAnswer) {
    try {
      const [userEmbedding, expectedEmbedding] = await Promise.all([
        getEmbedding(userAnswer),
        getEmbedding(expectedAnswer)
      ]);

      const similarity = calculateCosineSimilarity(userEmbedding, expectedEmbedding);
      const score = Math.round(similarity * 100);

      return {
        score,
        feedback: this.getSemanticFeedback(similarity),
        details: { similarity }
      };
    } catch (error) {
      console.error('Semantic evaluation failed:', error);
      return {
        score: 0,
        feedback: 'Could not perform semantic analysis',
        details: { error: error.message }
      };
    }
  }

  // Keyword-based evaluation
  async keywordEvaluation(userAnswer, expectedAnswer) {
    const expectedKeywords = this.extractKeywords(expectedAnswer);
    const userKeywords = this.extractKeywords(userAnswer);
    
    const categorizedKeywords = this.categorizeKeywords(expectedKeywords);
    let score = 0;
    const found = [];
    const missing = [];

    Object.entries(categorizedKeywords).forEach(([category, keywords]) => {
      const weight = this.keywordWeights[category];
      keywords.forEach(keyword => {
        if (this.containsKeyword(userAnswer, keyword)) {
          score += weight * 25; // 25 points per weight unit
          found.push({ keyword, category });
        } else {
          missing.push({ keyword, category });
        }
      });
    });

    return {
      score: Math.min(100, Math.round(score)),
      feedback: this.getKeywordFeedback(found, missing),
      details: { found, missing, expectedKeywords, userKeywords }
    };
  }

  // Structure evaluation (organization, flow)
  async structureEvaluation(userAnswer, expectedAnswer) {
    const userStructure = this.analyzeStructure(userAnswer);
    const expectedStructure = this.analyzeStructure(expectedAnswer);
    
    let score = 50; // Base score
    
    // Compare sentence count
    const sentenceRatio = Math.min(userStructure.sentences / expectedStructure.sentences, 1);
    score += sentenceRatio * 20;
    
    // Check for logical flow indicators
    if (userStructure.hasFlowIndicators) score += 15;
    
    // Check for definitions
    if (userStructure.hasDefinitions && expectedStructure.hasDefinitions) score += 15;
    
    return {
      score: Math.min(100, Math.round(score)),
      feedback: this.getStructureFeedback(userStructure, expectedStructure),
      details: { userStructure, expectedStructure }
    };
  }

  // Completeness evaluation
  async completenessEvaluation(userAnswer, expectedAnswer) {
    const userLength = userAnswer.trim().split(/\s+/).length;
    const expectedLength = expectedAnswer.trim().split(/\s+/).length;
    
    const lengthRatio = Math.min(userLength / expectedLength, 1);
    const score = Math.round(lengthRatio * 100);
    
    return {
      score,
      feedback: this.getCompletenessFeedback(lengthRatio, userLength, expectedLength),
      details: { userLength, expectedLength, lengthRatio }
    };
  }

  // Helper methods
  extractKeywords(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }

  categorizeKeywords(keywords) {
    // Simple categorization - could be enhanced with domain knowledge
    const critical = keywords.filter(word => this.isCriticalTerm(word));
    const important = keywords.filter(word => this.isImportantTerm(word) && !critical.includes(word));
    const supporting = keywords.filter(word => !critical.includes(word) && !important.includes(word));
    
    return {
      critical,
      important,
      supporting,
      context: []
    };
  }

  isCriticalTerm(word) {
    const criticalTerms = [
      'learning', 'training', 'model', 'algorithm', 'data',
      'supervised', 'unsupervised', 'neural', 'network',
      'fine-tuning', 'optimization', 'gradient', 'loss'
    ];
    return criticalTerms.includes(word.toLowerCase());
  }

  isImportantTerm(word) {
    const importantTerms = [
      'accuracy', 'performance', 'validation', 'testing',
      'feature', 'parameter', 'hyperparameter', 'epoch',
      'bias', 'variance', 'overfitting', 'underfitting'
    ];
    return importantTerms.includes(word.toLowerCase());
  }

  isStopWord(word) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'can', 'may', 'might', 'must'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  containsKeyword(text, keyword) {
    const normalizedText = text.toLowerCase();
    const normalizedKeyword = keyword.toLowerCase();
    
    // Exact match
    if (normalizedText.includes(normalizedKeyword)) return true;
    
    // Stemmed match (simple)
    const stemmed = this.simpleStem(normalizedKeyword);
    return normalizedText.includes(stemmed);
  }

  simpleStem(word) {
    // Very basic stemming
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('s')) return word.slice(0, -1);
    return word;
  }

  analyzeStructure(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const hasFlowIndicators = /\b(first|second|third|finally|therefore|however|moreover|furthermore|additionally)\b/i.test(text);
    const hasDefinitions = /\bis\s+\w+|\bdefin\w+|\bmeans?\b/i.test(text);
    
    return {
      sentences: sentences.length,
      hasFlowIndicators,
      hasDefinitions,
      avgSentenceLength: sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
    };
  }

  // Feedback generation methods
  getSemanticFeedback(similarity) {
    if (similarity >= 0.8) return 'Excellent semantic match! Your answer captures the meaning very well.';
    if (similarity >= 0.6) return 'Good semantic understanding. Your answer is on the right track.';
    if (similarity >= 0.4) return 'Some semantic similarity detected. Consider focusing on key concepts.';
    return 'Limited semantic match. Try to align your answer more closely with the expected concepts.';
  }

  getKeywordFeedback(found, missing) {
    const foundCount = found.length;
    const missingCount = missing.length;
    
    if (missingCount === 0) return 'Excellent keyword coverage!';
    if (foundCount > missingCount) return 'Good keyword usage with some gaps to address.';
    return 'Several important keywords missing. Focus on key terminology.';
  }

  getStructureFeedback(userStructure, expectedStructure) {
    if (userStructure.hasFlowIndicators) return 'Well-structured answer with good flow.';
    if (userStructure.sentences >= expectedStructure.sentences * 0.7) return 'Adequate structure and length.';
    return 'Consider expanding your answer and improving organization.';
  }

  getCompletenessFeedback(ratio, userLength, expectedLength) {
    if (ratio >= 0.8) return 'Comprehensive answer with good depth.';
    if (ratio >= 0.5) return 'Moderately complete answer. Could be expanded.';
    return 'Answer seems incomplete. Try to provide more detail.';
  }

  generateFeedback(finalScore, scores) {
    if (finalScore >= 90) return 'Outstanding answer! You demonstrate excellent understanding.';
    if (finalScore >= 80) return 'Very good answer! Minor improvements could make it perfect.';
    if (finalScore >= 70) return 'Good answer! You understand the main concepts well.';
    if (finalScore >= 60) return 'Decent answer with room for improvement. Focus on key concepts.';
    if (finalScore >= 50) return 'Basic understanding shown. More practice needed.';
    return 'Significant improvement needed. Review the material and try again.';
  }

  extractSimilarities(scores) {
    const similarities = [];
    
    scores.forEach(score => {
      if (score.details?.found) {
        score.details.found.forEach(item => {
          similarities.push(`Used key term: "${item.keyword}"`);
        });
      }
    });
    
    return similarities.slice(0, 5); // Limit to 5 items
  }

  extractMissingConcepts(scores) {
    const missing = [];
    
    scores.forEach(score => {
      if (score.details?.missing) {
        score.details.missing.forEach(item => {
          if (item.category === 'critical' || item.category === 'important') {
            missing.push(`Missing: "${item.keyword}"`);
          }
        });
      }
    });
    
    return missing.slice(0, 5); // Limit to 5 items
  }

  generateSuggestions(scores) {
    const suggestions = [];
    
    const semantic = scores[0];
    const keyword = scores[1];
    const structure = scores[2];
    const completeness = scores[3];
    
    if (semantic.score < 60) {
      suggestions.push('Focus on the core concepts and their relationships');
    }
    
    if (keyword.score < 60) {
      suggestions.push('Include more specific technical terminology');
    }
    
    if (structure.score < 60) {
      suggestions.push('Organize your answer with clear logical flow');
    }
    
    if (completeness.score < 60) {
      suggestions.push('Provide more detailed explanations and examples');
    }
    
    return suggestions;
  }

  calculateConfidence(scores) {
    const validScores = scores.filter(s => s.score > 0);
    if (validScores.length === 0) return 0;
    
    const variance = this.calculateVariance(validScores.map(s => s.score));
    const avgScore = validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length;
    
    // Higher confidence when scores are consistent and high
    const consistencyFactor = Math.max(0, 1 - variance / 1000);
    const scoreFactor = avgScore / 100;
    
    return Math.min(1, consistencyFactor * scoreFactor);
  }

  calculateVariance(scores) {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  }
}

// Export singleton instance
export const advancedEvaluator = new AdvancedEvaluator();

// Fallback evaluation for when OpenAI is not available
export const fallbackEvaluation = (userAnswer, expectedAnswer, question) => {
  const keywords = expectedAnswer.toLowerCase().split(/\W+/).filter(word => word.length > 3);
  const userWords = userAnswer.toLowerCase().split(/\W+/);
  
  const matchedKeywords = keywords.filter(keyword => 
    userWords.some(word => word.includes(keyword) || keyword.includes(word))
  );
  
  const score = Math.round((matchedKeywords.length / keywords.length) * 100);
  
  return {
    score,
    isCorrect: score >= 70,
    feedback: score >= 70 ? 'Good answer!' : 'Try to include more key concepts.',
    similarities: matchedKeywords.map(k => `Mentioned: ${k}`),
    missingConcepts: keywords.filter(k => !matchedKeywords.includes(k)).map(k => `Missing: ${k}`),
    suggestions: ['Try to use more specific terminology', 'Include examples if possible'],
    confidence: 0.6
  };
};
