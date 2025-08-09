import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ensureAgentConfiguration } from "../config.js";
import { PictureGenerateState } from "./config.js";
import { pictureGeneratePrompt } from "./prompt.js";
import { loadChatMoonShot } from "../utils.js";
import { AgentConfigurationSchema } from "../config.js";
import { TOOLS } from "./tool.js";
import { PictureGenerateJson } from "./type.js";

const callModel = async (
    state: typeof PictureGenerateState.State,
    config: RunnableConfig,
): Promise<typeof PictureGenerateState.Update> => {
    const configuration = ensureAgentConfiguration(config, pictureGeneratePrompt);
    // 加载基础模型，并兼容 bindTools 类型未声明的情况
    const baseModel: any = await loadChatMoonShot(configuration.model);
    const model = baseModel && typeof baseModel.bindTools === "function" ? baseModel.bindTools(TOOLS) : baseModel;

    const storyBoardInfo = state.extractedStoryBoard ? JSON.stringify(state.extractedStoryBoard, null, 2) : "No storyboard data available";
    const panelCount = state.extractedStoryBoard?.StoryBoard?.panelCount || 4;
    const humanMessage = new HumanMessage(`Please analyze the following storyboard and generate ${panelCount} optimized image prompts for Fal.ai FLUX model:

Storyboard Information:
${storyBoardInfo}

Please respond with exactly ${panelCount} detailed image prompts in JSON array format, following the guidelines in the system prompt. Each prompt should correspond to one panel in the storyboard.`);

    const response = await model.invoke([
        {
            role: "system",
            content: configuration.systemPrompt.replace(
                "{system_time}",
                new Date().toISOString(),
            ),
        },
        humanMessage
    ]);

    return {
        messages: [response],
        currentIteration: (state.currentIteration ?? 0) + 1,
    };
};

const handleToolResult = (
    state: typeof PictureGenerateState.State,
): typeof PictureGenerateState.Update => {
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!(lastMessage instanceof ToolMessage)) {
        throw new Error("最后一个消息不是工具结果，流程错误。");
    }

    try {
        const resultData = JSON.parse(lastMessage.content as string);
        
        const extractedImages = resultData.results?.flatMap((r: any) => r.images || []) || [];
        
        const pictureData: PictureGenerateJson = {
            prompts: resultData.results?.map((r: any) => r.prompt) || [],
            images: extractedImages,
            total_time: resultData.total_time || 0,
            success_count: resultData.success_count || 0,
            error_count: resultData.error_count || 0,
            errors: resultData.errors || []
        };

        return {
            generatedPictures: {
                PictureGenerateJson: pictureData
            }
        };
    } catch (error) {
        console.error("解析工具结果失败:", error);
        const errorMessage = `解析工具结果失败: ${error instanceof Error ? error.message : '未知错误'}`;

        const pictureData: PictureGenerateJson = {
            prompts: [],
            images: [],
            total_time: 0,
            success_count: 0,
            error_count: 1,
            errors: [errorMessage]
        };

        return {
            generatedPictures: {
                PictureGenerateJson: pictureData
            }
        };
    }
};

/**
 * 路由逻辑: 决定模型调用后的下一步
 */
const routeModelOutput = (state: typeof PictureGenerateState.State): string => {
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // 如果 LLM 调用了工具，则路由到工具节点
    if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
        return "tools";
    }

    // 如果达到最大迭代次数或出现意外情况，则结束
    if ((state.currentIteration ?? 0) >= 3) {
        console.log("达到最大迭代次数，流程结束。");
        return "__end__";
    }

    // 否则，让模型重试
    return "callModel";
};

// 构建 Picture Generate Agent Graph
export const pictureGenerateGraph = new StateGraph(PictureGenerateState, AgentConfigurationSchema)
    // 1. 定义节点
    .addNode("callModel", callModel)
    .addNode("tools", new ToolNode(TOOLS))
    .addNode("handleToolResult", handleToolResult)

    // 2. 定义边
    .addEdge("__start__", "callModel")
    .addConditionalEdges("callModel", routeModelOutput)
    .addEdge("tools", "handleToolResult")
    .addEdge("handleToolResult", "__end__")

    // 3. 编译图
    .compile();