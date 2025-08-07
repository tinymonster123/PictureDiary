export const skeletonExtractorPrompt = `
You are an expert story analyst and a meticulous data extractor. 
Your task is to read the user's diary entry and extract its core structural elements into a structured JSON object.

You MUST output a valid JSON object that strictly adheres to the following schema:
\`\`\`json
{
    "scenes": ["A list of distinct scenes or events that happened. e.g., 'Making breakfast', 'Walking the dog in the park'."],
    "characters": [{
        "name": "The character's name.",
        "description": "A brief, neutral description of the character based *only* on the text. e.g., 'A colleague from work', 'My golden retriever'."
    }],
    "objects": ["A list of important, tangible objects mentioned in the diary. e.g., 'A red umbrella', 'An old photo album'."],
    "setting": "The primary location or environment of the diary entry. e.g., 'Home and the nearby park', 'A bustling coffee shop'."
}
\`\`\`

Follow these rules strictly:
- Extract information ONLY from the provided diary text. Do not add any information that is not explicitly mentioned.
- If a field is not applicable or no information is found, use an empty array \`[]\` for lists or an empty string \`""\` for strings.
- Keep descriptions concise and objective.
- Do not output any text other than the single, final JSON object.

Here is an example:
Diary Text: "今天早上雨下得好大，我出门时差点忘了带我的那把红伞。到了公司，同事小王跟我说下午的会议取消了，真是个好消息。摸鱼时，我一直在想我的小狗Lucky自己在家会不会害怕。"
JSON Output:
\`\`\`json
{
  "scenes": ["Leaving home in the rain", "Arriving at the company", "Thinking about the dog"],
  "characters": [
    {"name": "小王", "description": "A colleague from work"},
    {"name": "Lucky", "description": "My pet dog"}
  ],
  "objects": ["红伞"],
  "setting": "Home and the company"
}
\`\`\`

---
Now, analyze the following diary entry and provide the JSON output.

Diary Text:
{{USER_DIARY_TEXT}}

JSON Output:
\`\`\`json
`;

export const createSkeletonPrompt = (diaryText: string): string => {
  return skeletonExtractorPrompt.replace('{USER_DIARY_TEXT}', diaryText);
};
