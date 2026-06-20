const mongoose = require('mongoose');

const VideoGenerationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
  sceneNumber: { type: Number },
  provider: { type: String, required: true },
  prompt: { type: String, required: true },
  format: { type: String },
  duration: { type: Number },
  aspectRatio: { type: String },
  style: { type: mongoose.Schema.Types.Mixed },
  segments: { type: mongoose.Schema.Types.Mixed },
  includeVoiceover: { type: Boolean, default: false },
  includeMusic: { type: Boolean, default: false },
  musicGenre: { type: String },
  jobId: { type: String, index: true },
  externalJobUrl: { type: String },
  videoUrl: { type: String },
  thumbnailUrl: { type: String },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  error: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  retryCount: { type: Number, default: 0 },
  completedAt: { type: Date }
}, {
  timestamps: true
});

VideoGenerationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('VideoGeneration', VideoGenerationSchema);
