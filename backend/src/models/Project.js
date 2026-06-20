const mongoose = require('mongoose');
const { PIPELINE_STAGES, JOB_STATUS, VIRAL_THRESHOLDS } = require('../config/constants');

const ViralScoreSchema = new mongoose.Schema({
  hookScore: { type: Number, default: 0 },
  retentionScore: { type: Number, default: 0 },
  viralScore: { type: Number, default: 0 },
  emotionalScore: { type: Number, default: 0 },
  shareabilityScore: { type: Number, default: 0 },
  storyScore: { type: Number, default: 0 },
  passedGate: { type: Boolean, default: false },
  analysis: { type: String },
  scoredAt: { type: Date }
}, { _id: false });

const SceneSchema = new mongoose.Schema({
  sceneNumber: { type: Number, required: true },
  title: { type: String },
  description: { type: String },
  prompt: { type: String },
  duration: { type: Number },
  cameraAngle: { type: String },
  lighting: { type: String },
  mood: { type: String },
  characters: [{ type: String }],
  location: { type: String },
  wardrobe: { type: String },
  videoClipId: { type: String },
  videoUrl: { type: String },
  status: { type: String, enum: Object.values(JOB_STATUS), default: JOB_STATUS.PENDING },
  generationProvider: { type: String },
  externalJobId: { type: String }
});

const ProjectSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  concept: { type: String, required: true },
  niche: { type: String, default: 'reckoning_files' },
  targetDuration: { type: Number, required: true },
  targetPlatforms: [{ type: String }],
  aspectRatio: { type: String, default: '16:9' },

  // Pipeline state
  currentStage: { type: String, enum: PIPELINE_STAGES, default: 'idea_generation' },
  pipelineStatus: { type: String, enum: Object.values(JOB_STATUS), default: JOB_STATUS.PENDING },
  stageStatuses: {
    type: Map,
    of: new mongoose.Schema({
      status: String,
      startedAt: Date,
      completedAt: Date,
      error: String,
      output: mongoose.Schema.Types.Mixed
    }, { _id: false }),
    default: () => new Map()
  },

  // AI-generated content
  researchData: { type: mongoose.Schema.Types.Mixed },
  trendData: { type: mongoose.Schema.Types.Mixed },
  script: {
    hook: { type: String },
    body: { type: String },
    callToAction: { type: String },
    fullScript: { type: String },
    wordCount: { type: Number },
    estimatedDuration: { type: Number }
  },
  storyboard: { type: mongoose.Schema.Types.Mixed },
  scenes: [SceneSchema],
  videoPrompts: [{ type: String }],

  // Media assets
  voiceoverUrl: { type: String },
  voiceoverDuration: { type: Number },
  musicTrackUrl: { type: String },
  soundEffects: [{ type: String }],
  finalVideoUrl: { type: String },
  thumbnailUrl: { type: String },
  thumbnailVariants: [{ type: String }],

  // Scores & intelligence
  viralScore: ViralScoreSchema,
  viralGatePassed: { type: Boolean, default: false },

  // SEO
  seoData: {
    title: { type: String },
    description: { type: String },
    tags: [{ type: String }],
    hashtags: [{ type: String }],
    thumbnailText: { type: String }
  },

  // Publishing
  publishingData: {
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    platforms: [{ type: mongoose.Schema.Types.Mixed }]
  },

  // Metadata
  style: { type: String, default: 'cinematic' },
  totalScenes: { type: Number, default: 0 },
  completedScenes: { type: Number, default: 0 },
  estimatedRenderTime: { type: Number },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, {
  timestamps: true
});

ProjectSchema.index({ userId: 1, pipelineStatus: 1 });
ProjectSchema.index({ 'viralScore.viralScore': -1 });
ProjectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Project', ProjectSchema);
