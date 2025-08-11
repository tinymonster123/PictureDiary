import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
const envPath = resolve(process.cwd(), "../../.env");
config({ path: envPath });

// const chooseModel = (text: string): string => {
//     const modelName = text.length > 2000 ? "moonshot-v1-8k" : "moonshot-v1-8k"
//     return modelName
// }

export const loadChatMoonShot = async (
  modelName: string
): Promise<ChatOpenAI> => {
  const model = new ChatOpenAI({
    apiKey: process.env.MODEL_API_KEY,
    model: modelName,
    temperature: 0.1,
    configuration: {
      baseURL: process.env.BASE_URL,
    },
  });
  return model;
};
