/**
 * AI Prompt Generator Service
 * Placeholder service for generating creative cooking prompts
 * Structured for OpenAI/Gemini integration
 */

class AIPromptGenerator {
  constructor() {
    // Placeholder prompts for development
    this.promptTemplates = [
      "A dish that tastes like nostalgia",
      "Something that feels like a rainy Tuesday afternoon",
      "A meal that reminds you of childhood memories",
      "A dish that represents your favorite season",
      "Something that tastes like home",
      "A meal inspired by your favorite book",
      "A dish that feels like a warm hug",
      "Something that reminds you of a special celebration",
      "A meal that represents your cultural heritage",
      "A dish that feels like adventure",
      "Something that tastes like comfort",
      "A meal inspired by your favorite color",
      "A dish that represents friendship",
      "Something that feels like a lazy Sunday morning",
      "A meal that reminds you of a favorite place",
      "A dish that tastes like joy",
      "Something that feels like autumn",
      "A meal inspired by your favorite music",
      "A dish that represents new beginnings",
      "Something that tastes like love"
    ];
  }

  /**
   * Generate a random cooking prompt
   * @returns {Promise<string>} A creative cooking prompt
   */
  async generatePrompt() {
    try {
      // For now, return a random prompt from our templates
      // In production, this would call OpenAI or Gemini API
      const randomIndex = Math.floor(Math.random() * this.promptTemplates.length);
      const prompt = this.promptTemplates[randomIndex];
      
      console.log(`Generated AI prompt: "${prompt}"`);
      return prompt;
    } catch (error) {
      console.error('Error generating AI prompt:', error);
      // Fallback to a default prompt
      return "Create something delicious and creative";
    }
  }

  /**
   * Generate a contextual prompt based on game state or player count
   * @param {Object} context - Context information (playerCount, gameState, etc.)
   * @returns {Promise<string>} A contextual cooking prompt
   */
  async generateContextualPrompt(context = {}) {
    try {
      const { playerCount, gameState, previousPrompts = [] } = context;
      
      // Filter out recently used prompts to avoid repetition
      const availablePrompts = this.promptTemplates.filter(
        prompt => !previousPrompts.includes(prompt)
      );
      
      // Use available prompts or fall back to all prompts if all have been used
      const promptsToChooseFrom = availablePrompts.length > 0 ? availablePrompts : this.promptTemplates;
      
      const randomIndex = Math.floor(Math.random() * promptsToChooseFrom.length);
      const prompt = promptsToChooseFrom[randomIndex];
      
      console.log(`Generated contextual AI prompt: "${prompt}" (players: ${playerCount})`);
      return prompt;
    } catch (error) {
      console.error('Error generating contextual AI prompt:', error);
      return "Create something delicious and creative";
    }
  }

  /**
   * Validate a prompt (for future AI service integration)
   * @param {string} prompt - The prompt to validate
   * @returns {boolean} Whether the prompt is valid
   */
  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return false;
    }
    
    if (prompt.trim().length < 10 || prompt.trim().length > 200) {
      return false;
    }
    
    // Check for inappropriate content (basic validation)
    const inappropriateWords = ['hate', 'violence', 'inappropriate'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const word of inappropriateWords) {
      if (lowerPrompt.includes(word)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get prompt statistics (for analytics)
   * @returns {Object} Prompt usage statistics
   */
  getPromptStats() {
    return {
      totalPrompts: this.promptTemplates.length,
      lastGenerated: new Date().toISOString(),
      serviceVersion: '1.0.0'
    };
  }
}

module.exports = AIPromptGenerator;
