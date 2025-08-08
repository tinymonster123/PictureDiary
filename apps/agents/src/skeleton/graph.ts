import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { ensureAgentConfiguration } from "../config.js";
import { SkeletonState } from "./config.js";
import { skeletonExtractorPrompt } from "./prompt.js";
import { loadChatMoonShot } from "../utils.js";
import { AgentConfigurationSchema } from "../config.js";
import { StateGraph } from "@langchain/langgraph";
import { SkeletonJson } from "./type.js";


const callModel = async (
    state: typeof SkeletonState.State,
    config: RunnableConfig,
): Promise<typeof SkeletonState.Update> => {
    const configuration = ensureAgentConfiguration(config, skeletonExtractorPrompt)

    const model = await loadChatMoonShot(configuration.model)
    const message = new HumanMessage(state.diaryText)
    const response = await model.invoke([
        {
            role: "system",
            content: configuration.systemPrompt.replace(
                "{USER_DIARY_TEXT}",
                state.diaryText,
            ),
        },
        message
    ]);

    // 解析模型返回，提取 JSON
    let extractedSkeleton: SkeletonJson | null = null;
    try {

        const raw = (response as AIMessage).content as unknown as string;
        if (typeof raw === "string") {
            // 优先解析 ```json 代码块
            const codeBlockMatch = raw.match(/```json[\s\S]*?```/i);
            const jsonText = codeBlockMatch
                ? codeBlockMatch[0].replace(/```json/i, "").replace(/```/, "").trim()
                : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
            if (jsonText) {
                extractedSkeleton = JSON.parse(jsonText);
            }
        }
    } catch (_error) {
        extractedSkeleton = null;
    }

    return {
        extractedSkeleton,
        currentIteration: (state.currentIteration ?? 0) + 1,
    };
}

const skeletonRouteModelOutput = (state: typeof SkeletonState.State): string => {
    const lastSkeleton = state.extractedSkeleton

    if (lastSkeleton) {
        return "__end__"
    }

    if (state.currentIteration >= 3) {
        return "__end__"
    }

    return "callModel"
}


// 构建 Agent Graph
export const skeletonGraph = new StateGraph(SkeletonState, AgentConfigurationSchema)
    .addNode("callModel", callModel)
    .addEdge("__start__", "callModel")
    .addConditionalEdges("callModel", skeletonRouteModelOutput)
    .compile();