/**
 * AI Prompt Generator Service
 * Placeholder service for generating creative cooking prompts
 * Structured for OpenAI/Gemini integration
 */

class AIPromptGenerator {
  constructor() {
    // Expanded prompt templates for development
    this.promptTemplates = [
      // Emotional & Memory-Based Prompts
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
      "Something that tastes like love",
      
      // Time & Weather-Based Prompts
      "A meal that captures the essence of sunrise",
      "Something that tastes like a thunderstorm",
      "A dish that feels like a snow day",
      "A meal inspired by golden hour",
      "Something that reminds you of summer vacation",
      "A dish that captures the coziness of winter",
      "A meal that tastes like spring awakening",
      "Something that feels like a beach day",
      "A dish that represents midnight cravings",
      "A meal inspired by foggy mornings",
      
      // Color & Visual Prompts
      "A dish that's as vibrant as a sunset",
      "Something that looks like edible art",
      "A meal inspired by your favorite painting",
      "A dish that captures the beauty of autumn leaves",
      "Something that looks like a rainbow",
      "A meal that's monochromatic but delicious",
      "A dish inspired by the ocean's colors",
      "Something that looks like a garden",
      "A meal that captures moonlight",
      "A dish inspired by city lights",
      
      // Texture & Sensory Prompts
      "Something with the perfect crunch",
      "A dish that melts in your mouth",
      "A meal that's both hot and cold",
      "Something with surprising textures",
      "A dish that's silky smooth",
      "A meal that's perfectly crispy",
      "Something that's both soft and firm",
      "A dish with layers of texture",
      "A meal that's satisfyingly chewy",
      "Something that's perfectly tender",
      
      // Mood & Atmosphere Prompts
      "A dish that makes you feel sophisticated",
      "Something that's playful and fun",
      "A meal that's mysterious and intriguing",
      "A dish that's elegant and refined",
      "Something that's rustic and hearty",
      "A meal that's whimsical and magical",
      "A dish that's bold and daring",
      "Something that's gentle and soothing",
      "A meal that's exciting and dynamic",
      "A dish that's peaceful and calming",
      
      // Story & Character Prompts
      "A meal fit for a fairy tale character",
      "Something a superhero would eat",
      "A dish inspired by your favorite movie",
      "A meal that tells a story",
      "Something a wizard would create",
      "A dish inspired by a famous person",
      "A meal that's like a plot twist",
      "Something a detective would enjoy",
      "A dish inspired by a legendary creature",
      "A meal that's like a happy ending",
      
      // Technique & Method Prompts
      "Something made with only one pot",
      "A dish that's perfectly balanced",
      "A meal that's deceptively simple",
      "Something that's beautifully plated",
      "A dish that's made with love",
      "A meal that's perfectly seasoned",
      "Something that's artfully arranged",
      "A dish that's masterfully crafted",
      "A meal that's thoughtfully composed",
      "Something that's expertly executed",
      
      // Ingredient & Flavor Prompts
      "A dish that's unexpectedly sweet",
      "Something that's perfectly spicy",
      "A meal that's beautifully bitter",
      "A dish that's wonderfully tangy",
      "Something that's delightfully salty",
      "A meal that's refreshingly cool",
      "A dish that's satisfyingly rich",
      "Something that's pleasantly sour",
      "A meal that's wonderfully earthy",
      "A dish that's beautifully aromatic",
      
      // Occasion & Event Prompts
      "A meal for a first date",
      "Something perfect for a picnic",
      "A dish for a celebration",
      "A meal for a cozy night in",
      "Something for a grand feast",
      "A dish for a quiet moment",
      "A meal for sharing with friends",
      "Something for a special occasion",
      "A dish for a romantic dinner",
      "A meal for a family gathering",
      
      // Travel & Culture Prompts
      "A dish that takes you on a journey",
      "Something inspired by distant lands",
      "A meal that's like a passport stamp",
      "A dish that's internationally inspired",
      "Something that's like a cultural exchange",
      "A meal that's globally influenced",
      "A dish that's like a world tour",
      "Something that's cross-cultural",
      "A meal that's like an adventure abroad",
      "A dish that's internationally delicious",
      
      // Abstract & Creative Prompts
      "A dish that's like a poem",
      "Something that's like a dance",
      "A meal that's like a song",
      "A dish that's like a dream",
      "Something that's like a wish",
      "A meal that's like a memory",
      "A dish that's like a feeling",
      "Something that's like a thought",
      "A meal that's like an emotion",
      "A dish that's like a moment",
      
      // Challenge & Skill Prompts
      "Something that's surprisingly easy",
      "A dish that's deceptively difficult",
      "A meal that's perfectly timed",
      "Something that's beautifully simple",
      "A dish that's impressively complex",
      "A meal that's skillfully prepared",
      "Something that's creatively challenging",
      "A dish that's technically impressive",
      "A meal that's artistically crafted",
      "Something that's masterfully done",
      
      // Nature & Environment Prompts
      "A dish inspired by the forest",
      "Something that tastes like the ocean",
      "A meal inspired by mountain air",
      "A dish that's like a garden",
      "Something that's like a meadow",
      "A meal inspired by the desert",
      "A dish that's like a river",
      "Something that's like a valley",
      "A meal inspired by the sky",
      "A dish that's like a breeze",
      
      // Unexpected & Surprising Prompts
      "Something that's unexpectedly delicious",
      "A dish that's surprisingly satisfying",
      "A meal that's wonderfully weird",
      "Something that's delightfully different",
      "A dish that's charmingly unusual",
      "A meal that's pleasantly surprising",
      "Something that's intriguingly unique",
      "A dish that's fascinatingly different",
      "A meal that's wonderfully unexpected",
      "Something that's beautifully bizarre"
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
