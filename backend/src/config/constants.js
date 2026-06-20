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
    protagonist: 'never_helpless_after_hook',
    creatorModel: null
  },
  GROWTH_TECH: {
    id: 'growth_tech',
    name: 'GrowthTech',
    themes: ['business_secrets', 'startup_psychology', 'wealth_building', 'entrepreneur_mindset',
      'side_hustle', 'tech_leverage', 'market_domination', 'productivity_hacks'],
    tone: 'direct_raw_authentic_urgent',
    protagonist: 'self_made_builder',
    format: 'talking_head_or_faceless_broll',
    creatorModel: {
      handle: 'sina.growthtech',
      platform: 'tiktok',
      style: 'raw_authentic_direct_camera',
      energy: 'high_conviction_casual',
      background: 'real_environments_american_flag',
      captionStyle: 'conversational_lowercase',
      hookType: 'bold_claim_or_story_opener',
      audienceTrust: 'built_through_specificity_and_results'
    }
  },
  AI_EDUCATION: {
    id: 'ai_education',
    name: 'AI Education',
    themes: ['build_with_ai', 'ai_tools_revealed', 'build_in_public', 'make_money_with_ai',
      'automate_everything', 'ai_for_beginners', 'coding_with_ai', 'digital_products'],
    tone: 'enthusiastic_practical_demonstrative',
    protagonist: 'builder_showing_live_proof',
    format: 'screen_recording_with_face_cam_overlay',
    creatorModel: {
      handle: 'kevin.dink.ai',
      platform: 'tiktok',
      style: 'live_screen_recording_with_talking_head',
      energy: 'excited_builder_sharing_discovery',
      background: 'screen_share_vs_code_or_browser',
      captionStyle: 'bold_title_cards_and_text_overlays',
      hookType: 'show_the_result_first_then_reveal_how',
      audienceTrust: 'built_through_live_demonstration_and_proof',
      saveRateSignal: 'extremely_high_reference_worthy_content'
    }
  }
};

const CREATOR_PROFILES = {
  'kevin.dink.ai': {
    handle: 'kevin.dink.ai',
    platform: 'tiktok',
    niche: 'ai_education',
    contentPillars: [
      'build with Claude Code',
      'AI tools nobody talks about',
      'live build sessions',
      'make money with AI',
      'automate your business',
      'AI for content creators'
    ],
    hookFormulas: [
      'For $[price]/month, AI built me an entire [X]...',
      'LIVE: Watch me build [X] in [time] with Claude Code',
      'This AI tool changed how I build everything',
      'I automated [painful task] completely. Here\'s how.',
      '[Number] AI tools I wish I knew sooner'
    ],
    videoStyle: {
      cameraStyle: 'picture_in_picture_face_over_screen',
      editingPace: 'moderate_with_zoom_highlights_on_key_moments',
      backgroundStyle: 'live_screen_recording_vs_code_or_browser',
      captionStyle: 'bold_title_cards_large_text_overlays',
      musicStyle: 'light_upbeat_background_or_none'
    },
    audienceProfile: {
      demographics: '20-40 mixed_but_tech_skewed',
      interests: ['AI tools', 'coding', 'side_hustle', 'automation', 'content_creation', 'solopreneur'],
      painPoints: ['too_slow_to_build', 'dont_know_how_to_code', 'wasting_time_on_manual_work'],
      aspirations: ['build_products_fast', 'passive_income', 'use_ai_effectively', 'ship_faster']
    },
    viralPatterns: {
      avgViews: '30k-300k',
      peakViralTrigger: 'live_demonstration_of_impossible_result',
      commentTrigger: 'what_tool_is_that_or_how_do_i_start',
      shareTrigger: 'reference_worthy_step_by_step_process',
      saveTrigger: 'specific_workflow_people_want_to_replicate',
      saveRatePattern: 'near_1_to_1_save_to_like_ratio'
    }
  },
  'sina.growthtech': {
    handle: 'sina.growthtech',
    platform: 'tiktok',
    niche: 'growth_tech',
    contentPillars: ['business growth hacks', 'entrepreneur psychology', 'wealth secrets',
      'startup leverage', 'side hustle systems', 'tech for business'],
    hookFormulas: [
      'The thing nobody tells you about [X]...',
      'I made [result] doing [counter-intuitive thing]',
      'Stop doing [common thing]. Here\'s why.',
      '[Number] years ago I [situation]. Now [dramatic result].',
      'The [industry] secret they don\'t want you to know'
    ],
    videoStyle: {
      cameraStyle: 'handheld_direct_to_camera',
      editingPace: 'fast_cuts_with_text_overlays',
      backgroundStyle: 'authentic_real_life',
      captionStyle: 'bold_text_overlays_key_points',
      musicStyle: 'upbeat_or_no_music_raw_audio'
    },
    audienceProfile: {
      demographics: '22-38 male_skewed',
      interests: ['entrepreneurship', 'side_hustle', 'finance', 'self_improvement'],
      painPoints: ['stuck_in_job', 'want_financial_freedom', 'scaling_business'],
      aspirations: ['financial_independence', 'business_success', 'lifestyle_freedom']
    },
    viralPatterns: {
      avgViews: '50k-500k',
      peakViralTrigger: 'counter_intuitive_business_insight',
      commentTrigger: 'controversial_opinion_or_specific_number',
      shareTrigger: 'actionable_insight_worth_saving'
    }
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
  CREATOR_PROFILES,
  CINEMATIC_DIRECTORS,
  VIDEO_FORMATS,
  JOB_STATUS,
  SCENE_DURATION_SECONDS
};
