const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-sonnet-4-6';
  }

  async complete(systemPrompt, userPrompt, options = {}) {
    const {
      maxTokens = 4096,
      temperature = 1,
      jsonMode = false
    } = options;

    try {
      const messages = [{ role: 'user', content: userPrompt }];

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages
      });

      const text = response.content[0].text;

      if (jsonMode) {
        return this._parseJSON(text);
      }

      return text;
    } catch (error) {
      logger.error(`Claude API error: ${error.message}`);
      throw error;
    }
  }

  async completeWithHistory(systemPrompt, messages, options = {}) {
    const { maxTokens = 4096 } = options;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages
      });

      return response.content[0].text;
    } catch (error) {
      logger.error(`Claude API error with history: ${error.message}`);
      throw error;
    }
  }

  _parseJSON(text) {
    // Strip markdown code blocks if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch {
      // Try to extract JSON from the text
      const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`Failed to parse JSON from Claude response: ${text.substring(0, 200)}`);
    }
  }
}

module.exports = new ClaudeService();
