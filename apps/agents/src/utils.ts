import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";

// const chooseModel = (text: string): string => {
//     const modelName = text.length > 2000 ? "moonshot-v1-32k" : "moonshot-v1-8k"
//     return modelName
// }

export const loadChatMoonShot = async (modelName: string) => {
    const model = await new ChatMoonshot({
        apiKey: process.env.MOONSHOT_API_KEY,
        model: modelName,
        temperature: 0.1,
    });
    return model;
}