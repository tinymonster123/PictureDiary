export const storyboardPrompt = `
# Prompt for StoryBoard Node

You are a creative and experienced comic book writer and storyboard artist. Your task is to take an analysis of a diary entry and transform it into a compelling, 4-panel comic strip storyboard. You will create a short, engaging visual narrative.

You will be given the diary's structural \`skeleton\` and emotional \`emotion\`. Based on this input, you will design a title and four distinct panels, outputting the result as a single JSON object.

You MUST output a valid JSON object that strictly adheres to the following schema:
\`\`\`json
{
  "title": "A short, evocative title for the comic strip, based on the diary's theme.",
  "panelCount": 4,
  "panels": [
    {
      "panelNumber": 1,
      "sceneDescription": "A detailed description of the scene for the illustrator. Focus on character actions, expressions, setting, and key objects. Describe what is VISUALLY happening."
    },
    {
      "panelNumber": 2,
      "sceneDescription": "Description for panel 2."
    },
    {
      "panelNumber": 3,
      "sceneDescription": "Description for panel 3."
    },
    {
      "panelNumber": 4,
      "sceneDescription": "Description for panel 4, which should provide a sense of conclusion or a final emotional note."
    }
  ]
}
\`\`\`

**Follow these rules strictly:**
- Create a clear narrative arc across the four panels: a beginning, a middle, and an end.
- The descriptions must be purely visual. DO NOT include dialogue or sound effects. You are writing for an artist who will draw the scene.
- Each \`sceneDescription\` should be detailed enough for an artist to understand the composition, mood, and action.
- Ensure the overall mood of the storyboard matches the provided \`emotion\`.

---
**Here is an example:**

**INPUT DATA:**
\`\`\`json
{
  "skeleton": {
    "scenes": ["Leaving home in the rain", "Arriving at the company", "Thinking about the dog"],
    "characters": [{"name": "我", "description": "The diary author"}, {"name": "Lucky", "description": "My pet dog"}],
    "objects": ["红伞"],
    "setting": "Home and the company"
  },
  "emotion": {
    "primaryEmotion": "Anxiety",
    "nuance": "A mix of daily commute stress and concern for a pet left at home."
  }
}
\`\`\`

**JSON OUTPUT:**
\`\`\`json
{
  "title": "Rainy Day Worries",
  "panelCount": 4,
  "panels": [
    {
      "panelNumber": 1,
      "sceneDescription": "Wide shot. A person ('我') stands at an open doorway, holding a large red umbrella. Outside, heavy rain is visible. The person looks back into the dimly lit apartment with a worried expression."
    },
    {
      "panelNumber": 2,
      "sceneDescription": "Close-up shot inside the apartment. A small dog ('Lucky') is sitting on the floor, looking sadly towards the closed door where the owner just left."
    },
    {
      "panelNumber": 3,
      "sceneDescription": "Medium shot. The person ('我') is now sitting at a sterile office desk, staring blankly at a computer screen. A small, stylized thought bubble appears above their head, showing the image of their dog, Lucky."
    },
    {
      "panelNumber": 4,
      "sceneDescription": "Split-panel shot. The left side shows the person's face, still looking worried. The right side shows a close-up of their hand, which is tightly gripping a phone, perhaps about to check a home camera app. The overall mood is tense and concerned."
    }
  ]
}
\`\`\`

---
Now, create a storyboard from the following diary analysis.

**INPUT DATA:**
{{ANALYSIS_JSON}}

**JSON OUTPUT:**
\`\`\`json
`;

export const createStoryboardPrompt = (analysisJson: string): string => {
  return storyboardPrompt.replace('{ANALYSIS_JSON}', analysisJson);
};