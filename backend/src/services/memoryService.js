const Memory = require('../models/Memory');
const logger = require('../utils/logger');

class MemoryService {
  async store(memoryData) {
    try {
      const existing = await Memory.findOne({ key: memoryData.key });

      if (existing) {
        Object.assign(existing, memoryData);
        existing.useCount += 1;
        existing.lastUsed = new Date();
        return await existing.save();
      }

      return await Memory.create({
        ...memoryData,
        useCount: 1,
        lastUsed: new Date()
      });
    } catch (error) {
      logger.error(`Memory store failed: ${error.message}`);
      throw error;
    }
  }

  async retrieve(type, niche = 'reckoning_files', limit = 5) {
    return await Memory.find({ type, niche })
      .sort({ viralScore: -1, useCount: -1 })
      .limit(limit)
      .lean();
  }

  async retrieveByPerformance(type, minViralScore = 85) {
    return await Memory.find({ type, viralScore: { $gte: minViralScore } })
      .sort({ viralScore: -1 })
      .limit(10)
      .lean();
  }

  async updatePerformance(memoryId, performanceData) {
    return await Memory.findByIdAndUpdate(
      memoryId,
      { $set: { performance: performanceData }, $inc: { useCount: 1 } },
      { new: true }
    );
  }

  async getTopPatterns(type, limit = 10) {
    return await Memory.find({ type })
      .sort({ 'performance.views': -1, viralScore: -1 })
      .limit(limit)
      .lean();
  }

  async saveViralPattern(projectId, analyticsData) {
    return await this.store({
      type: 'trend_pattern',
      key: `viral_moment_${projectId}`,
      content: {
        views: analyticsData.metrics?.views,
        retentionRate: analyticsData.metrics?.retentionRate,
        platform: analyticsData.platform,
        viralAt: new Date()
      },
      projectId,
      viralScore: 99,
      tags: ['viral_moment', 'high_performance']
    });
  }

  async search(query, type = null) {
    const filter = type ? { type } : {};
    return await Memory.find({
      ...filter,
      $text: { $search: query }
    }).limit(10).lean();
  }
}

module.exports = new MemoryService();
