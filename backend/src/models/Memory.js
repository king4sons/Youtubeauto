const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['winning_video', 'viral_hook', 'viral_thumbnail', 'audience_preference',
      'editing_style', 'story_structure', 'trend_pattern', 'script_template',
      'music_preference', 'seo_pattern', 'director_style'],
    required: true,
    index: true
  },
  key: { type: String, required: true, index: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  platform: { type: String },
  niche: { type: String, default: 'reckoning_files' },
  performance: {
    views: { type: Number, default: 0 },
    watchTime: { type: Number, default: 0 },
    retentionRate: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    subscribers: { type: Number, default: 0 }
  },
  viralScore: { type: Number, default: 0 },
  useCount: { type: Number, default: 0 },
  lastUsed: { type: Date },
  embedding: [{ type: Number }],
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

MemorySchema.index({ type: 1, viralScore: -1 });
MemorySchema.index({ niche: 1, type: 1 });
MemorySchema.index({ 'performance.views': -1 });

module.exports = mongoose.model('Memory', MemorySchema);
