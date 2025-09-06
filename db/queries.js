const dbConnection = require('./connection');
const { Definition, ExtractionSession } = require('./models');

class DefinitionQueries {
  constructor() {
    this.isConnected = false;
  }

  async ensureConnection() {
    if (!this.isConnected) {
      await dbConnection.connect();
      this.isConnected = true;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await dbConnection.disconnect();
      this.isConnected = false;
    }
  }

  // ========== SEARCH & FIND OPERATIONS ==========

  /**
   * Find definitions by concept name (case-insensitive partial match)
   */
  async findByConcept(conceptName, options = {}) {
    await this.ensureConnection();
    
    const query = {
      concept: new RegExp(conceptName, 'i')
    };

    return await Definition.find(query)
      .sort(options.sort || { concept: 1 })
      .limit(options.limit || 0)
      .lean();
  }

  /**
   * Search definitions by text content (concept name or definition text)
   */
  async searchText(searchTerm, options = {}) {
    await this.ensureConnection();
    
    return await Definition.find({
      $text: { $search: searchTerm }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(options.limit || 20)
    .lean();
  }

  /**
   * Find definitions by source file
   */
  async findByFile(filePath, options = {}) {
    await this.ensureConnection();
    
    return await Definition.find({
      'source.file': filePath
    })
    .sort(options.sort || { 'source.section': 1, concept: 1 })
    .limit(options.limit || 0)
    .lean();
  }

  /**
   * Find definitions by section name
   */
  async findBySection(sectionName, options = {}) {
    await this.ensureConnection();
    
    return await Definition.find({
      'source.section': new RegExp(sectionName, 'i')
    })
    .sort(options.sort || { concept: 1 })
    .limit(options.limit || 0)
    .lean();
  }

  /**
   * Find definitions extracted within a date range
   */
  async findByDateRange(startDate, endDate, options = {}) {
    await this.ensureConnection();
    
    return await Definition.find({
      extracted_at: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .sort(options.sort || { extracted_at: -1 })
    .limit(options.limit || 0)
    .lean();
  }

  // ========== AGGREGATION OPERATIONS ==========

  /**
   * Get statistics about definitions
   */
  async getStats() {
    await this.ensureConnection();
    
    const stats = await Definition.aggregate([
      {
        $group: {
          _id: null,
          total_definitions: { $sum: 1 },
          total_files: { $addToSet: '$source.file' },
          total_sections: { $addToSet: '$source.section' },
          avg_definition_length: { $avg: { $strLenCP: '$definition' } },
          total_tokens: { $sum: '$metadata.total_tokens' }
        }
      },
      {
        $project: {
          _id: 0,
          total_definitions: 1,
          total_files: { $size: '$total_files' },
          total_sections: { $size: '$total_sections' },
          avg_definition_length: { $round: ['$avg_definition_length', 0] },
          total_tokens: 1
        }
      }
    ]);

    return stats[0] || {
      total_definitions: 0,
      total_files: 0,
      total_sections: 0,
      avg_definition_length: 0,
      total_tokens: 0
    };
  }

  /**
   * Group definitions by section with counts
   */
  async getDefinitionsBySection() {
    await this.ensureConnection();
    
    return await Definition.aggregate([
      {
        $group: {
          _id: {
            section: '$source.section',
            file: '$source.file'
          },
          count: { $sum: 1 },
          concepts: { $push: '$concept' },
          total_tokens: { $sum: '$metadata.total_tokens' }
        }
      },
      {
        $sort: { '_id.file': 1, '_id.section': 1 }
      }
    ]);
  }

  /**
   * Get definitions grouped by file
   */
  async getDefinitionsByFile() {
    await this.ensureConnection();
    
    return await Definition.aggregate([
      {
        $group: {
          _id: '$source.file',
          count: { $sum: 1 },
          sections: { $addToSet: '$source.section' },
          concepts: { $push: '$concept' },
          total_tokens: { $sum: '$metadata.total_tokens' }
        }
      },
      {
        $project: {
          file: '$_id',
          count: 1,
          sections_count: { $size: '$sections' },
          sections: 1,
          concepts: 1,
          total_tokens: 1,
          _id: 0
        }
      },
      {
        $sort: { file: 1 }
      }
    ]);
  }

  // ========== CRUD OPERATIONS ==========

  /**
   * Get a specific definition by ID
   */
  async getById(definitionId) {
    await this.ensureConnection();
    
    return await Definition.findById(definitionId).lean();
  }

  /**
   * Update a definition
   */
  async updateDefinition(definitionId, updates) {
    await this.ensureConnection();
    
    const updatedDefinition = await Definition.findByIdAndUpdate(
      definitionId, 
      { 
        ...updates,
        extracted_at: new Date() // Update timestamp
      }, 
      { new: true }
    );

    return updatedDefinition;
  }

  /**
   * Delete a definition
   */
  async deleteDefinition(definitionId) {
    await this.ensureConnection();
    
    return await Definition.findByIdAndDelete(definitionId);
  }

  /**
   * Bulk insert definitions (for batch operations)
   */
  async bulkInsert(definitions) {
    await this.ensureConnection();
    
    return await Definition.insertMany(definitions, { 
      ordered: false, // Continue on duplicates
      lean: true 
    });
  }

  // ========== SESSION OPERATIONS ==========

  /**
   * Get extraction sessions
   */
  async getSessions(options = {}) {
    await this.ensureConnection();
    
    return await ExtractionSession.find()
      .sort(options.sort || { started_at: -1 })
      .limit(options.limit || 10)
      .lean();
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    await this.ensureConnection();
    
    const stats = await ExtractionSession.aggregate([
      {
        $group: {
          _id: null,
          total_sessions: { $sum: 1 },
          completed_sessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          total_concepts_processed: { $sum: '$total_concepts' },
          total_successful_extractions: { $sum: '$successful_extractions' },
          total_tokens_used: { $sum: '$total_tokens_used' },
          avg_tokens_per_request: { $avg: '$average_tokens_per_request' }
        }
      },
      {
        $project: {
          _id: 0,
          total_sessions: 1,
          completed_sessions: 1,
          success_rate: {
            $cond: [
              { $gt: ['$total_concepts_processed', 0] },
              { 
                $multiply: [
                  { $divide: ['$total_successful_extractions', '$total_concepts_processed'] },
                  100
                ]
              },
              0
            ]
          },
          total_concepts_processed: 1,
          total_successful_extractions: 1,
          total_tokens_used: 1,
          avg_tokens_per_request: { $round: ['$avg_tokens_per_request', 0] }
        }
      }
    ]);

    return stats[0] || {
      total_sessions: 0,
      completed_sessions: 0,
      success_rate: 0,
      total_concepts_processed: 0,
      total_successful_extractions: 0,
      total_tokens_used: 0,
      avg_tokens_per_request: 0
    };
  }

  // ========== UTILITY OPERATIONS ==========

  /**
   * Get random definitions (for sampling/testing)
   */
  async getRandomDefinitions(count = 5) {
    await this.ensureConnection();
    
    return await Definition.aggregate([
      { $sample: { size: count } }
    ]);
  }

  /**
   * Find missing definitions (concepts that should have definitions but don't)
   */
  async findMissingDefinitions(expectedConcepts) {
    await this.ensureConnection();
    
    const existingConcepts = await Definition.distinct('concept');
    const missingConcepts = expectedConcepts.filter(
      concept => !existingConcepts.includes(concept)
    );

    return missingConcepts;
  }

  /**
   * Export definitions to JSON
   */
  async exportToJSON(options = {}) {
    await this.ensureConnection();
    
    const definitions = await Definition.find()
      .sort({ 'source.file': 1, 'source.section': 1, concept: 1 })
      .lean();

    const exportData = {
      exported_at: new Date().toISOString(),
      total_definitions: definitions.length,
      definitions: options.includeMetadata ? definitions : definitions.map(def => ({
        concept: def.concept,
        definition: def.definition,
        source: def.source,
        extracted_at: def.extracted_at
      }))
    };

    return exportData;
  }
}

module.exports = new DefinitionQueries();