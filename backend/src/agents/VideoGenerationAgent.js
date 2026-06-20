const BaseAgent = require('./base/BaseAgent');
const VideoGeneration = require('../models/VideoGeneration');
const videoGenerationService = require('../services/videoGenerationService');
const logger = require('../utils/logger');

class VideoGenerationAgent extends BaseAgent {
  constructor() {
    super('video_generation');
  }

  async execute(project, context) {
    this.log(`Generating video scenes for: "${project.title}"`);

    const { promptData, storyboard } = context;
    const scenes = storyboard?.scenes || [];
    const prompts = promptData?.prompts || [];

    if (scenes.length === 0) {
      throw new Error('No scenes to generate');
    }

    // Determine best provider based on duration
    const generationJobs = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const promptObj = prompts[i] || {};
      const provider = this._selectProvider(scene.duration);
      const prompt = promptObj.masterPrompt || promptObj.veo3Prompt || scene.visualDescription;

      try {
        const job = await videoGenerationService.generateVideo({
          prompt,
          provider,
          format: project.targetDuration > 300 ? 'longform' : 'shortform',
          duration: Math.min(scene.duration, 120),
          aspectRatio: project.aspectRatio || '16:9',
          style: { cinematic: true, colorGrade: scene.colorGrading },
          userId: project.userId,
          projectId: project._id,
          sceneNumber: scene.sceneNumber
        });

        generationJobs.push({
          sceneNumber: scene.sceneNumber,
          jobId: job.jobId,
          generationId: job.generationId,
          provider,
          status: 'processing',
          estimatedTime: job.estimatedTime
        });

        this.publish(project._id, 'scene_generation_started', {
          sceneNumber: scene.sceneNumber,
          provider,
          jobId: job.jobId
        });

      } catch (error) {
        logger.error(`Scene ${scene.sceneNumber} generation failed: ${error.message}`);
        generationJobs.push({
          sceneNumber: scene.sceneNumber,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      totalScenes: scenes.length,
      jobs: generationJobs,
      estimatedCompletionTime: this._calculateTotalEstimate(generationJobs)
    };
  }

  _selectProvider(sceneDuration) {
    // Select provider based on scene duration
    if (sceneDuration <= 30) return 'pika';
    if (sceneDuration <= 60) return 'kling';
    if (sceneDuration <= 120) return 'runway';
    return 'veo3';
  }

  _calculateTotalEstimate(jobs) {
    // All jobs run in parallel, so total time is the max
    const validJobs = jobs.filter(j => j.estimatedTime);
    if (validJobs.length === 0) return 300;
    return Math.max(...validJobs.map(j => j.estimatedTime));
  }
}

module.exports = new VideoGenerationAgent();
