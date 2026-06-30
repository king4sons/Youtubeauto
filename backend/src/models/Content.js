const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema({
  id: Number,
  title: String,
  prompt: String,
  duration: Number,
  order: Number,
  status: { type: String, default: 'pending' }
});

const contentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },

  // Content metadata
  title: { type: String, required: true },
  topic: String,
  platform: {
    type: String,
    enum: ['youtube', 'tiktok', 'instagram_reels', 'youtube_shorts', 'all'],
    default: 'youtube'
  },
  contentType: {
    type: String,
    enum: ['shortform', 'longform', 'extended'],
    required: true
  },

  // Script
  script: {
    hook: String,
    body: String,
    callToAction: String,
    fullScript: String,
    keywords: [String],
    estimatedDuration: Number
  },

  // Video generation
  video: {
    provider: String,
    jobId: String,
    status: {
      type: String,
      enum: ['draft', 'script_ready', 'generating', 'completed', 'failed'],
      default: 'draft'
    },
    prompt: String,
    aspectRatio: String,
    duration: Number,
    style: String,
    videoUrl: String,
    thumbnailUrl: String,
    segments: [segmentSchema],
    estimatedCompletionTime: Number,
    error: String
  },

  // Publishing
  publish: {
    scheduledAt: Date,
    publishedAt: Date,
    platforms: [String],
    youtubeVideoId: String,
    status: { type: String, enum: ['unpublished', 'scheduled', 'published'], default: 'unpublished' }
  },

  // SEO / metadata
  seo: {
    title: String,
    description: String,
    tags: [String],
    thumbnailPrompt: String
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

contentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Content', contentSchema);
