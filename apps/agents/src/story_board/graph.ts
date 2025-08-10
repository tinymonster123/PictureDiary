import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { ensureAgentConfiguration } from "../config.js";
import { StoryBoardState } from "./config.js";
import { storyboardPrompt } from "./prompt.js";
import { loadChatMoonShot } from "../utils.js";
import { AgentConfigurationSchema } from "../config.js";
import { StateGraph } from "@langchain/langgraph";
import { StoryBoardJson } from "./type.js";


const callModel = async (
    state: typeof StoryBoardState.State,
    config: RunnableConfig,
): Promise<typeof StoryBoardState.Update> => {
    const configuration = ensureAgentConfiguration(config, storyboardPrompt)

    const model = await loadChatMoonShot(configuration.model)

    // 构建分析数据的 JSON
    const analysisJson = JSON.stringify({
        skeleton: state.extractedSkeleton,
        emotion: state.extractedEmotion
    }, null, 2);

    const message = new HumanMessage(state.diaryText)
    const response = await model.invoke([
        {
            role: "system",
            content: configuration.systemPrompt.replace(
                "{{ANALYSIS_JSON}}",
                analysisJson,
            ),
        },
        message
    ]);

    // 解析模型返回，提取 JSON
    let extractedStoryBoard: StoryBoardJson | null = null;
    try {
        const raw = (response as AIMessage).content as unknown as string;
        if (typeof raw === "string") {
            // 优先解析 ```json 代码块
            const codeBlockMatch = raw.match(/```json[\s\S]*?```/i);
            const jsonText = codeBlockMatch
                ? codeBlockMatch[0].replace(/```json/i, "").replace(/```/, "").trim()
                : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
            if (jsonText) {
                extractedStoryBoard = JSON.parse(jsonText);
            }
        }
    } catch (_error) {
        extractedStoryBoard = null;
    }

    return {
        extractedStoryBoard,
        currentIteration: (state.currentIteration ?? 0) + 1,
    };
}

const storyBoardRouteModelOutput = (state: typeof StoryBoardState.State): string => {
    const lastStoryBoard = state.extractedStoryBoard

    if (lastStoryBoard) {
        return "__end__"
    }

    if (state.currentIteration >= 3) {
        return "__end__"
    }

    return "callModel"
}


// 构建 Agent Graph
export const storyBoardGraph = new StateGraph(StoryBoardState, AgentConfigurationSchema)
    .addNode("callModel", callModel)
    .addEdge("__start__", "callModel")
    .addConditionalEdges("callModel", storyBoardRouteModelOutput)
    .compile();
