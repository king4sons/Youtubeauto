const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the Research Agent for Reckoning Studio AI. Your job is to deeply research
a given concept and gather all facts, angles, emotional hooks, and narrative potential needed
to craft a viral cinematic story.

You specialize in:
- Betrayal, revenge, justice, psychological warfare, and strategic comeback stories
- Historical mysteries and documentary content
- Finding the most emotionally powerful angle for any story

Return a structured JSON object with your research findings.`;

class ResearchAgent extends BaseAgent {
  constructor() {
    super('research');
  }

  async execute(project, context) {
    this.log(`Researching concept: "${project.concept}"`);

    const prompt = `Research this video concept for The Reckoning Files channel:

CONCEPT: ${project.concept}
TARGET DURATION: ${Math.round(project.targetDuration / 60)} minutes
NICHE: Betrayal, revenge, justice, psychological warfare

Provide deep research in this JSON format:
{
  "coreNarrative": "The central story in one powerful sentence",
  "protagonistProfile": { "type": "...", "trait": "...", "arc": "..." },
  "antagonistProfile": { "type": "...", "motivation": "...", "downfall": "..." },
  "emotionalCore": "The primary emotion this story triggers",
  "keyFacts": ["fact 1", "fact 2", "..."],
  "historicalContext": "Relevant historical or cultural context",
  "psychologicalAngles": ["angle 1", "angle 2", "..."],
  "viralAngles": ["why people will share this", "..."],
  "audienceTriggers": ["trigger 1", "trigger 2", "..."],
  "controversyLevel": "low|medium|high",
  "authenticity": "What makes this feel real and raw",
  "similarSuccessfulStories": ["reference 1", "reference 2"],
  "bestHookApproach": "How to open this story for maximum impact",
  "storyMoments": [
    { "moment": "The Setup", "description": "..." },
    { "moment": "The Betrayal", "description": "..." },
    { "moment": "The Reckoning", "description": "..." },
    { "moment": "The Justice", "description": "..." }
  ],
  "memorableQuotes": ["quote or line for narration", "..."]
}`;

    const research = await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });

    return research;
  }
}

module.exports = new ResearchAgent();
