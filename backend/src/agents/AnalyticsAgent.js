const BaseAgent = require('./base/BaseAgent');
const Analytics = require('../models/Analytics');
const memoryService = require('../services/memoryService');
const logger = require('../utils/logger');

class AnalyticsAgent extends BaseAgent {
  constructor() {
    super('analytics');
  }

  async execute(project, context) {
    this.log(`Setting up analytics tracking for: "${project.title}"`);

    // Initialize analytics record
    const analyticsRecord = await Analytics.create({
      projectId: project._id,
      userId: project.userId,
      platform: project.targetPlatforms?.[0] || 'youtube',
      metrics: {},
      lastUpdated: new Date()
    });

    return {
      analyticsId: analyticsRecord._id,
      trackingSetup: true,
      retentionCurveTarget: [
        { timePercent: 0, retentionPercent: 100 },
        { timePercent: 10, retentionPercent: 92 },
        { timePercent: 25, retentionPercent: 78 },
        { timePercent: 50, retentionPercent: 65 },
        { timePercent: 75, retentionPercent: 58 },
        { timePercent: 100, retentionPercent: 50 }
      ],
      kpis: {
        targetViews7Days: '10,000+',
        targetRetentionRate: '50%+',
        targetCTR: '8%+',
        targetSubscriberConversion: '2%+'
      }
    };
  }

  async updateMetrics(projectId, metrics) {
    try {
      const analytics = await Analytics.findOne({ projectId });
      if (!analytics) return;

      Object.assign(analytics.metrics, metrics);
      analytics.lastUpdated = new Date();

      // Add snapshot
      analytics.snapshots.push({
        capturedAt: new Date(),
        views: metrics.views || 0,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0
      });

      // Detect viral moment
      if (metrics.views > 100000 && !analytics.viralMoment) {
        analytics.viralMoment = true;
        analytics.peakViewsAt = new Date();
        await memoryService.saveViralPattern(projectId, analytics);
      }

      await analytics.save();
      this.log(`Metrics updated for project ${projectId}`);
    } catch (error) {
      logger.error(`Analytics update failed: ${error.message}`);
    }
  }

  async getPerformanceReport(projectId) {
    const analytics = await Analytics.findOne({ projectId }).lean();
    if (!analytics) return null;

    return {
      totalViews: analytics.metrics.views,
      retentionRate: analytics.metrics.retentionRate,
      engagementRate: analytics.metrics.views > 0
        ? ((analytics.metrics.likes + analytics.metrics.comments + analytics.metrics.shares) / analytics.metrics.views * 100).toFixed(2)
        : 0,
      ctr: analytics.metrics.clickThroughRate,
      watchTimeHours: Math.round((analytics.metrics.watchTimeSeconds || 0) / 3600),
      viralMoment: analytics.viralMoment,
      snapshotCount: analytics.snapshots.length
    };
  }
}

module.exports = new AnalyticsAgent();
