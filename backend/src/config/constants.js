// Reckoning Studio AI — core constants

const DURATIONS = {
  SHORT: {
    FIFTEEN_SEC: 15,
    THIRTY_SEC: 30,
    SIXTY_SEC: 60,
    NINETY_SEC: 90,
    THREE_MIN: 180,
    FIVE_MIN: 300
  },
  LONG: {
    TEN_MIN: 600,
    FIFTEEN_MIN: 900,
    TWENTY_MIN: 1200,
    THIRTY_MIN: 1800
  }
};

const VIRAL_THRESHOLDS = {
  VIRAL_SCORE: 90,
  RETENTION_SCORE: 90,
  STORY_SCORE: 90,
  HOOK_SCORE: 85,
  EMOTIONAL_SCORE: 80
};

const PIPELINE_STAGES = [
  'idea_generation',
  'trend_analysis',
  'script_writing',
  'storyboard_building',
  'scene_planning',
  'prompt_generation',
  'video_generation',
  'voiceover_generation',
  'sound_design',
  'music_engine',
  'editing',
  'thumbnail_creation',
  'seo_generation',
  'publishing'
];

const AGENT_NAMES = {
  RESEARCH: 'research',
  TREND: 'trend',
  SCRIPT: 'script',
  STORYBOARD: 'storyboard',
  DIRECTOR: 'director',
  PROMPT_ENGINEER: 'prompt_engineer',
  VIDEO_GENERATION: 'video_generation',
  VOICE: 'voice',
  MUSIC: 'music',
  EDITING: 'editing',
  THUMBNAIL: 'thumbnail',
  SEO: 'seo',
  PUBLISHING: 'publishing',
  ANALYTICS: 'analytics',
  MEMORY: 'memory'
};

const CONTENT_NICHES = {
  RECKONING_FILES: {
    id: 'reckoning_files',
    name: 'The Reckoning Files',
    themes: ['betrayal', 'revenge', 'justice', 'psychological_warfare', 'strategic_comeback'],
    tone: 'cold_calculated_intelligent_cinematic',
    protagonist: 'never_helpless_after_hook'
  }
};

const CINEMATIC_DIRECTORS = ['christopher_nolan', 'denis_villeneuve', 'david_fincher'];

const VIDEO_FORMATS = {
  YOUTUBE_LANDSCAPE: { aspectRatio: '16:9', platform: 'youtube' },
  TIKTOK_PORTRAIT: { aspectRatio: '9:16', platform: 'tiktok' },
  INSTAGRAM_REELS: { aspectRatio: '9:16', platform: 'instagram' },
  FACEBOOK: { aspectRatio: '16:9', platform: 'facebook' },
  SHORTS: { aspectRatio: '9:16', platform: 'youtube_shorts' }
};

const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

const SCENE_DURATION_SECONDS = { MIN: 60, MAX: 360 }; // 1-6 minute cinematic scenes

module.exports = {
  DURATIONS,
  VIRAL_THRESHOLDS,
  PIPELINE_STAGES,
  AGENT_NAMES,
  CONTENT_NICHES,
  CINEMATIC_DIRECTORS,
  VIDEO_FORMATS,
  JOB_STATUS,
  SCENE_DURATION_SECONDS
};
