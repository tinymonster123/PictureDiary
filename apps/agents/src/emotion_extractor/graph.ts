import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { ensureAgentConfiguration } from "../config.js";
import { EmotionState } from "./config.js";
import { emotionExtractorPrompt } from "./prompt.js";
import { loadChatMoonShot } from "../utils.js";
import { AgentConfigurationSchema } from "../config.js";
import { StateGraph } from "@langchain/langgraph";
import { EmotionJson } from "./type.js";


const callModel = async (
    state: typeof EmotionState.State,
    config: RunnableConfig,
): Promise<typeof EmotionState.Update> => {
    const configuration = ensureAgentConfiguration(config, emotionExtractorPrompt)

    const model = await loadChatMoonShot(configuration.model)
    const message = new HumanMessage(state.diaryText)
    const response = await model.invoke([
        {
            role: "system",
            content: configuration.systemPrompt.replace(
                "{{USER_DIARY_TEXT}}",
                state.diaryText,
            ),
        },
        message
    ]);

    // 解析模型返回，提取 JSON
    let extractedEmotion: EmotionJson | null = null;
    try {
        const raw = (response as AIMessage).content as unknown as string;
        if (typeof raw === "string") {
            // 优先解析 ```json 代码块
            const codeBlockMatch = raw.match(/```json[\s\S]*?```/i);
            const jsonText = codeBlockMatch
                ? codeBlockMatch[0].replace(/```json/i, "").replace(/```/, "").trim()
                : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
            if (jsonText) {
                extractedEmotion = JSON.parse(jsonText);
            }
        }
    } catch (_error) {
        extractedEmotion = null;
    }

    return {
        extractedEmotion,
        currentIteration: (state.currentIteration ?? 0) + 1,
    };
}

const emotionRouteModelOutput = (state: typeof EmotionState.State): string => {
    const lastEmotion = state.extractedEmotion

    if (lastEmotion) {
        return "__end__"
    }

    if (state.currentIteration >= 3) {
        return "__end__"
    }

    return "callModel"
}


// 构建 Agent Graph
export const emotionGraph = new StateGraph(EmotionState, AgentConfigurationSchema)
    .addNode("callModel", callModel)
    .addEdge("__start__", "callModel")
    .addConditionalEdges("callModel", emotionRouteModelOutput)
    .compile();
