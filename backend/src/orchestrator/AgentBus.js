const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * AgentBus — shared event bus and message passing layer for all agents.
 * Agents publish messages here; the orchestrator and other agents subscribe.
 */
class AgentBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.messageLog = new Map(); // projectId -> messages[]
  }

  publish(projectId, agentName, eventType, data) {
    const message = {
      projectId,
      agentName,
      eventType,
      data,
      timestamp: new Date()
    };

    if (!this.messageLog.has(projectId)) {
      this.messageLog.set(projectId, []);
    }
    this.messageLog.get(projectId).push(message);

    // Keep last 500 messages per project
    const log = this.messageLog.get(projectId);
    if (log.length > 500) {
      this.messageLog.set(projectId, log.slice(-500));
    }

    this.emit(`${projectId}:${eventType}`, message);
    this.emit('message', message);

    logger.info(`[AgentBus] ${agentName} → ${eventType} for project ${projectId}`);
  }

  subscribe(projectId, eventType, handler) {
    this.on(`${projectId}:${eventType}`, handler);
  }

  unsubscribe(projectId, eventType, handler) {
    this.off(`${projectId}:${eventType}`, handler);
  }

  getMessages(projectId, limit = 50) {
    const log = this.messageLog.get(projectId) || [];
    return log.slice(-limit);
  }

  clearProject(projectId) {
    this.messageLog.delete(projectId);
  }
}

module.exports = new AgentBus();
