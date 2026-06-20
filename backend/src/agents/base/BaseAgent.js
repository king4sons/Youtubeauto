const logger = require('../../utils/logger');
const agentBus = require('../../orchestrator/AgentBus');
const claudeService = require('../../services/claudeService');

class BaseAgent {
  constructor(name) {
    this.name = name;
    this.bus = agentBus;
    this.claude = claudeService;
  }

  async run(project, context = {}) {
    this.publish(project._id, 'agent_started', { agent: this.name });
    try {
      const result = await this.execute(project, context);
      this.publish(project._id, 'agent_completed', { agent: this.name, result });
      return result;
    } catch (error) {
      this.publish(project._id, 'agent_failed', { agent: this.name, error: error.message });
      logger.error(`[${this.name}] failed for project ${project._id}: ${error.message}`);
      throw error;
    }
  }

  // Subclasses implement this
  async execute(project, context) {
    throw new Error(`${this.name}.execute() not implemented`);
  }

  publish(projectId, eventType, data) {
    this.bus.publish(String(projectId), this.name, eventType, data);
  }

  log(message) {
    logger.info(`[${this.name}] ${message}`);
  }
}

module.exports = BaseAgent;
