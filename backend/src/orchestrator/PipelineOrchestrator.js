const Project = require('../models/Project');
const agentBus = require('./AgentBus');
const logger = require('../utils/logger');
const { PIPELINE_STAGES, JOB_STATUS, VIRAL_THRESHOLDS } = require('../config/constants');

// Agents
const researchAgent = require('../agents/ResearchAgent');
const trendAgent = require('../agents/TrendAgent');
const scriptAgent = require('../agents/ScriptAgent');
const storyboardAgent = require('../agents/StoryboardAgent');
const directorAgent = require('../agents/DirectorAgent');
const promptEngineerAgent = require('../agents/PromptEngineerAgent');
const videoGenerationAgent = require('../agents/VideoGenerationAgent');
const voiceAgent = require('../agents/VoiceAgent');
const musicAgent = require('../agents/MusicAgent');
const editingAgent = require('../agents/EditingAgent');
const thumbnailAgent = require('../agents/ThumbnailAgent');
const seoAgent = require('../agents/SEOAgent');
const publishingAgent = require('../agents/PublishingAgent');
const analyticsAgent = require('../agents/AnalyticsAgent');
const memoryAgent = require('../agents/MemoryAgent');
const viralIntelligenceAgent = require('../agents/ViralIntelligenceAgent');

const MAX_VIRAL_ATTEMPTS = 3;

class PipelineOrchestrator {
  async run(projectId, options = {}) {
    const project = await Project.findById(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    logger.info(`[Pipeline] Starting for project: ${project.title}`);
    project.pipelineStatus = JOB_STATUS.PROCESSING;
    await project.save();

    agentBus.publish(projectId, 'orchestrator', 'pipeline_started', { projectId, title: project.title });

    try {
      const context = {};

      // Stage 1: Research
      await this._runStage(project, 'idea_generation', async () => {
        const data = await researchAgent.run(project, context);
        context.researchData = data;
        project.researchData = data;
        await project.save();
        return data;
      });

      // Stage 2: Trend Analysis
      await this._runStage(project, 'trend_analysis', async () => {
        const data = await trendAgent.run(project, context);
        context.trendData = data;
        project.trendData = data;
        await project.save();
        return data;
      });

      // Stage 3+4: Script Writing (with viral gate loop)
      let viralAttempts = 0;
      let viralGatePassed = false;

      while (!viralGatePassed && viralAttempts < MAX_VIRAL_ATTEMPTS) {
        viralAttempts++;

        await this._runStage(project, 'script_writing', async () => {
          const data = await scriptAgent.run(project, context);
          context.script = data;
          project.script = {
            hook: data.hook,
            body: [data.actOne, data.actTwo, data.actThree].filter(Boolean).join('\n\n'),
            callToAction: data.callToAction,
            fullScript: data.fullScript,
            wordCount: data.wordCount,
            estimatedDuration: data.estimatedDuration
          };
          await project.save();
          return data;
        });

        await this._runStage(project, 'storyboard_building', async () => {
          const data = await storyboardAgent.run(project, context);
          context.storyboard = data;
          project.storyboard = data;
          project.scenes = (data.scenes || []).map(s => ({
            sceneNumber: s.sceneNumber,
            title: s.title,
            description: s.visualDescription,
            prompt: '',
            duration: s.duration,
            cameraAngle: s.cameraAngle,
            lighting: s.lighting,
            mood: s.mood,
            location: s.location,
            status: JOB_STATUS.PENDING
          }));
          project.totalScenes = data.scenes?.length || 0;
          await project.save();
          return data;
        });

        // Viral Intelligence Gate
        const viralResult = await viralIntelligenceAgent.run(project, context);
        context.viralScoreData = viralResult;

        project.viralScore = {
          hookScore: viralResult.scores?.hookScore || 0,
          retentionScore: viralResult.scores?.retentionScore || 0,
          viralScore: viralResult.scores?.viralScore || 0,
          emotionalScore: viralResult.scores?.emotionalScore || 0,
          shareabilityScore: viralResult.scores?.shareabilityScore || 0,
          storyScore: viralResult.scores?.storyScore || 0,
          passedGate: viralResult.passed,
          analysis: viralResult.scores?.analysis,
          scoredAt: new Date()
        };
        project.viralGatePassed = viralResult.passed;
        await project.save();

        if (viralResult.passed) {
          viralGatePassed = true;
          agentBus.publish(projectId, 'orchestrator', 'viral_gate_passed', viralResult.scores);
        } else {
          agentBus.publish(projectId, 'orchestrator', 'viral_gate_failed', {
            attempt: viralAttempts,
            reason: viralResult.blockedReason,
            improvements: viralResult.improvements
          });

          if (viralAttempts < MAX_VIRAL_ATTEMPTS) {
            // Feed improvements back into context for next script attempt
            context.viralFeedback = viralResult.improvements;
            logger.info(`[Pipeline] Viral gate failed (attempt ${viralAttempts}). Regenerating...`);
          }
        }
      }

      if (!viralGatePassed) {
        project.pipelineStatus = JOB_STATUS.BLOCKED;
        await project.save();
        agentBus.publish(projectId, 'orchestrator', 'pipeline_blocked', {
          reason: 'Failed viral gate after max attempts'
        });
        return { status: 'blocked', projectId };
      }

      // Stage 5: Scene Planning (Director)
      await this._runStage(project, 'scene_planning', async () => {
        const data = await directorAgent.run(project, context);
        context.directorData = data;
        if (Array.isArray(data.directedScenes)) {
          data.directedScenes.forEach((ds, i) => {
            if (project.scenes[i] && ds.refinedVideoPrompt) {
              project.scenes[i].prompt = ds.refinedVideoPrompt;
            }
          });
          project.markModified('scenes');
        }
        await project.save();
        return data;
      });

      // Stage 6: Prompt Engineering
      await this._runStage(project, 'prompt_generation', async () => {
        const data = await promptEngineerAgent.run(project, context);
        context.promptData = data;
        project.videoPrompts = data.prompts?.map(p => p.masterPrompt) || [];
        await project.save();
        return data;
      });

      // Stage 7: Video Generation (async — fires jobs, doesn't wait for render)
      await this._runStage(project, 'video_generation', async () => {
        const data = await videoGenerationAgent.run(project, context);
        context.videoJobs = data;
        await project.save();
        return data;
      });

      // Stages 8-9: Voice + Music (sequential to avoid concurrent save races)
      await this._runStage(project, 'voiceover_generation', async () => {
        const data = await voiceAgent.run(project, context);
        context.voiceData = data;
        project.voiceoverUrl = data.audioUrl;
        project.voiceoverDuration = data.audioDuration;
        await project.save();
        return data;
      });

      await this._runStage(project, 'sound_design', async () => {
        const data = await musicAgent.run(project, context);
        context.musicData = data;
        project.musicTrackUrl = data.trackList?.[0]?.id || null;
        project.soundEffects = (data.soundDesignPlan?.elements || [])
          .map(e => e.sound || e.id)
          .filter(Boolean);
        await project.save();
        return data;
      });

      // Stage 10: Music Engine (music selection finalization)
      await this._runStage(project, 'music_engine', async () => {
        return { trackList: context.musicData?.trackList || [], status: 'ready' };
      });

      // Stage 11: Editing
      await this._runStage(project, 'editing', async () => {
        const data = await editingAgent.run(project, context);
        context.editingData = data;
        await project.save();
        return data;
      });

      // Stage 12: Thumbnail
      await this._runStage(project, 'thumbnail_creation', async () => {
        const data = await thumbnailAgent.run(project, context);
        context.thumbnailData = data;
        await project.save();
        return data;
      });

      // Stage 13: SEO
      await this._runStage(project, 'seo_generation', async () => {
        const data = await seoAgent.run(project, context);
        context.seoData = data;
        project.seoData = {
          title: data.youtube?.selectedTitle,
          description: data.youtube?.description?.body,
          tags: data.youtube?.tags || [],
          hashtags: data.tiktok?.hashtags || [],
          thumbnailText: data.thumbnailText
        };
        await project.save();
        return data;
      });

      // Stage 14: Publishing Plan
      await this._runStage(project, 'publishing', async () => {
        const data = await publishingAgent.run(project, context);
        context.publishingData = data;
        project.publishingData = {
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
          platforms: data.publishSchedule || []
        };
        await project.save();
        return data;
      });

      // Analytics Setup
      await analyticsAgent.run(project, context);

      // Memory Learning
      await memoryAgent.run(project, context);

      // Complete
      project.pipelineStatus = JOB_STATUS.COMPLETED;
      project.completedAt = new Date();
      await project.save();

      agentBus.publish(projectId, 'orchestrator', 'pipeline_completed', {
        projectId,
        viralScore: project.viralScore,
        sceneCount: project.totalScenes
      });

      logger.info(`[Pipeline] Completed for project: ${project.title}`);

      return {
        status: 'completed',
        projectId,
        viralScore: project.viralScore,
        scenes: project.totalScenes,
        seoTitle: project.seoData?.title
      };

    } catch (error) {
      logger.error(`[Pipeline] Failed for project ${projectId}: ${error.message}`);
      project.pipelineStatus = JOB_STATUS.FAILED;
      await project.save();

      agentBus.publish(projectId, 'orchestrator', 'pipeline_failed', { error: error.message });

      throw error;
    }
  }

  async _runStage(project, stageName, fn) {
    logger.info(`[Pipeline] Stage: ${stageName} for ${project._id}`);
    project.currentStage = stageName;

    const stageStart = new Date();
    const stages = project.stageStatuses || new Map();
    stages.set(stageName, { status: 'processing', startedAt: stageStart });
    project.stageStatuses = stages;
    project.markModified('stageStatuses');
    await project.save();

    agentBus.publish(String(project._id), 'orchestrator', 'stage_started', { stage: stageName });

    try {
      const result = await fn();

      stages.set(stageName, {
        status: 'completed',
        startedAt: stageStart,
        completedAt: new Date(),
        output: result ? '[output stored]' : null
      });
      project.stageStatuses = stages;
      project.markModified('stageStatuses');
      await project.save();

      agentBus.publish(String(project._id), 'orchestrator', 'stage_completed', { stage: stageName });

      return result;
    } catch (error) {
      stages.set(stageName, {
        status: 'failed',
        startedAt: stageStart,
        completedAt: new Date(),
        error: error.message
      });
      project.stageStatuses = stages;
      project.markModified('stageStatuses');
      await project.save();

      agentBus.publish(String(project._id), 'orchestrator', 'stage_failed', {
        stage: stageName,
        error: error.message
      });

      throw error;
    }
  }
}

module.exports = new PipelineOrchestrator();
