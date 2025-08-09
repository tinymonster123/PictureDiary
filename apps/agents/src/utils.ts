import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
const envPath = resolve(process.cwd(), "../../.env");
config({ path: envPath });

// const chooseModel = (text: string): string => {
//     const modelName = text.length > 2000 ? "moonshot-v1-8k" : "moonshot-v1-8k"
//     return modelName
// }

export const loadChatMoonShot = async (modelName: string): Promise<ChatMoonshot> => {
    const model = new ChatMoonshot({
        apiKey: process.env.MOONSHOT_API_KEY,
        model: modelName,
        temperature: 0.1,
    });
    return model;
}