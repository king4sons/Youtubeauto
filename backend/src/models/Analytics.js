const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: String, required: true, index: true },
  platform: { type: String },
  publishedVideoId: { type: String },

  metrics: {
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    watchTimeSeconds: { type: Number, default: 0 },
    averageViewDuration: { type: Number, default: 0 },
    retentionRate: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    subscribers: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },

  retentionCurve: [{
    timePercent: Number,
    retentionPercent: Number
  }],

  audienceData: {
    ageGroups: { type: Map, of: Number },
    genders: { type: Map, of: Number },
    topCountries: [{ country: String, percent: Number }],
    devices: { type: Map, of: Number }
  },

  trafficSources: {
    search: { type: Number, default: 0 },
    suggested: { type: Number, default: 0 },
    external: { type: Number, default: 0 },
    direct: { type: Number, default: 0 },
    playlist: { type: Number, default: 0 }
  },

  snapshots: [{
    capturedAt: Date,
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number
  }],

  viralMoment: { type: Boolean, default: false },
  peakViewsAt: { type: Date },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

AnalyticsSchema.index({ projectId: 1, platform: 1 });
AnalyticsSchema.index({ 'metrics.views': -1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
