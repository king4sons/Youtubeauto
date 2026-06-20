const BaseAgent = require('./base/BaseAgent');
const axios = require('axios');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are the Voice Agent for Reckoning Studio AI. You optimize narration scripts
for text-to-speech delivery, select the optimal voice profile for the content, and ensure
the narration sounds cold, calculated, and cinematic — never robotic or commercial.

You understand:
- SSML (Speech Synthesis Markup Language) for pacing control
- Dramatic pause placement
- Emphasis and stress patterns
- Voice selection for psychological impact`;

const VOICE_PROFILES = {
  reckoning: {
    voiceId: process.env.ELEVENLABS_VOICE_RECKONING || 'pNInz6obpgDQGcFmaJgB', // Adam - deep, authoritative
    name: 'The Reckoner',
    description: 'Cold, authoritative, calculated. For betrayal and justice stories.',
    settings: {
      stability: 0.6,
      similarity_boost: 0.85,
      style: 0.4,
      use_speaker_boost: true
    }
  },
  documentary: {
    voiceId: process.env.ELEVENLABS_VOICE_DOCUMENTARY || 'EXAVITQu4vr4xnSDxMaL', // Sarah
    name: 'The Documentarian',
    description: 'Measured, serious, investigative. For historical mysteries.',
    settings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.2,
      use_speaker_boost: true
    }
  }
};

class VoiceAgent extends BaseAgent {
  constructor() {
    super('voice');
  }

  async execute(project, context) {
    this.log(`Generating voiceover for: "${project.title}"`);

    const { script } = context;
    if (!script?.fullScript) {
      throw new Error('Script required for voice generation');
    }

    // Optimize script for TTS
    const optimizedScript = await this._optimizeForTTS(script.fullScript, project);

    // Select voice profile
    const voiceProfile = this._selectVoiceProfile(project);

    // Generate voiceover via ElevenLabs
    const audioResult = await this._generateAudio(optimizedScript, voiceProfile);

    return {
      voiceProfile: voiceProfile.name,
      voiceId: voiceProfile.voiceId,
      optimizedScript: optimizedScript.text,
      ssmlScript: optimizedScript.ssml,
      audioUrl: audioResult.audioUrl,
      audioDuration: audioResult.duration,
      segments: audioResult.segments
    };
  }

  async _optimizeForTTS(rawScript, project) {
    const prompt = `Optimize this narration script for dramatic text-to-speech delivery for The Reckoning Files:

ORIGINAL SCRIPT:
${rawScript.substring(0, 6000)}

Create an optimized version that:
1. Adds dramatic pauses with ... or [pause] markers
2. Marks EMPHASIS words
3. Removes stage directions (B-ROLL, SCENE BREAK markers)
4. Keeps the cold, calculated tone
5. Optimizes sentence rhythm for spoken delivery

Return as JSON:
{
  "text": "Clean text version for TTS",
  "ssml": "<speak>SSML version with breaks and emphasis</speak>",
  "segments": [
    { "text": "segment text", "duration_estimate": 5.5, "emotion": "cold" }
  ],
  "totalEstimatedDuration": 0
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true, maxTokens: 8192 });
  }

  _selectVoiceProfile(project) {
    // Default to Reckoning voice for betrayal/revenge content
    const niche = project.niche || 'reckoning_files';
    if (niche === 'reckoning_files') return VOICE_PROFILES.reckoning;
    return VOICE_PROFILES.documentary;
  }

  async _generateAudio(scriptData, voiceProfile) {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      logger.warn('ElevenLabs API key not configured — skipping audio generation');
      return {
        audioUrl: null,
        duration: scriptData.totalEstimatedDuration || 0,
        segments: scriptData.segments || []
      };
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceProfile.voiceId}`,
        {
          text: scriptData.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: voiceProfile.settings
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      // In production: upload buffer to S3/cloud storage and return URL
      // For now, return metadata
      return {
        audioUrl: `pending_upload_${Date.now()}.mp3`,
        audioBuffer: response.data,
        duration: scriptData.totalEstimatedDuration || 0,
        segments: scriptData.segments || []
      };
    } catch (error) {
      logger.error(`ElevenLabs generation failed: ${error.message}`);
      return {
        audioUrl: null,
        duration: scriptData.totalEstimatedDuration || 0,
        segments: scriptData.segments || [],
        error: error.message
      };
    }
  }
}

module.exports = new VoiceAgent();
