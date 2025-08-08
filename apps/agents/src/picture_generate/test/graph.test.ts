import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AIMessage } from "@langchain/core/messages";
import { pictureGenerateGraph } from "../graph.js";
import { loadChatMoonShot } from "../../utils.js";
import { TOOLS } from "../tool.js";

// mock: 加载模型
jest.mock("../../utils.js", () => ({
    loadChatMoonShot: jest.fn(),
}));

// mock: 工具数组（ToolNode 会调用 tool.invoke(...)）
jest.mock("../tool.js", () => ({
    TOOLS: [
        {
            name: "fal_ai_image_generation",
            invoke: jest.fn(),
        },
    ],
}));

type ToolInvoke = (args: { input: string }) => Promise<string>;

describe("pictureGenerateGraph", () => {
    const llmInvoke = jest.fn() as jest.MockedFunction<any>;
    let toolInvokeMock: jest.MockedFunction<ToolInvoke>;

    beforeEach(() => {
        jest.clearAllMocks();

        // 绑定工具后的模型同样暴露 invoke
        (loadChatMoonShot as jest.MockedFunction<typeof loadChatMoonShot>).mockResolvedValue({
            invoke: llmInvoke,
            bindTools: jest.fn().mockReturnValue({ invoke: llmInvoke }),
        } as any);

        toolInvokeMock = (TOOLS[0] as any).invoke as jest.MockedFunction<ToolInvoke>;
        toolInvokeMock.mockReset();
    });

    it("工具调用成功：应写入 generatedPictures 并迭代+1", async () => {
        const diaryText = "今天心情不错，去了公园。";
        const mockStoryBoard = {
            StoryBoard: {
                title: "在公园",
                panelCount: 4,
                panels: [
                    { panelNumber: 1, sceneDescription: "wide shot of a park" },
                    { panelNumber: 2, sceneDescription: "close-up of a flower" },
                    { panelNumber: 3, sceneDescription: "medium shot of a person reading" },
                    { panelNumber: 4, sceneDescription: "sunset over the lake" },
                ],
            },
        };

        const prompts = [
            "Style A, wide park, daylight, wide shot, soft lighting, detailed",
            "Style A, flower close-up, macro, bokeh, detailed",
            "Style A, person reading, bench, medium shot, natural lighting",
            "Style A, lake sunset, warm tones, cinematic composition",
        ];

        const images = [0, 1, 2, 3].map((i) => ({
            url: `https://example.com/img${i + 1}.jpg`,
            width: 1024,
            height: 1024,
            content_type: "image/jpeg",
        }));

        const toolResponse = {
            results: prompts.map((p, i) => ({
                prompt: p,
                images: [images[i]],
                seed: 42 + i,
                timings: { total: 1500 },
                has_nsfw_concepts: [false],
            })),
            total_time: 6000,
            success_count: 4,
            error_count: 0,
            errors: [],
        };

        // LLM 返回需要调用工具
        llmInvoke.mockResolvedValue(
            new AIMessage({
                content: "Generating prompts...",
                tool_calls: [
                    {
                        id: "t1",
                        type: "tool_call",
                        name: "fal_ai_image_generation",
                        args: { input: JSON.stringify(prompts) },
                    },
                ],
            })
        );

        // 工具返回 JSON 字符串
        toolInvokeMock.mockResolvedValue(JSON.stringify(toolResponse));

        const result = await pictureGenerateGraph.invoke({
            diaryText,
            extractedStoryBoard: mockStoryBoard,
        });

        expect(llmInvoke).toHaveBeenCalledTimes(1);
        expect(toolInvokeMock).toHaveBeenCalledTimes(1);
        // ToolNode 调用工具时会传入 tool_call 对象作为第一个参数
        const firstCall = toolInvokeMock.mock.calls[0];
        expect(firstCall[0]).toMatchObject({
            args: { input: JSON.stringify(prompts) },
            name: "fal_ai_image_generation",
            type: "tool_call"
        });

        expect(result.generatedPictures).toEqual({
            PictureGenerateJson: {
                prompts,
                images,
                total_time: 6000,
                success_count: 4,
                error_count: 0,
                errors: [],
            },
        });
        expect(result.currentIteration).toBe(1);
    });

    it("无效prompts：应重试3次且不调用工具，最终不产生结果", async () => {
        const mockStoryBoard = {
            StoryBoard: {
                title: "测试",
                panelCount: 2,
                panels: [
                    { panelNumber: 1, sceneDescription: "scene 1" },
                    { panelNumber: 2, sceneDescription: "scene 2" },
                ],
            },
        };

        // LLM 始终不返回 tool_calls，触发重试
        llmInvoke.mockResolvedValue(new AIMessage({ content: "invalid" }));

        const result = await pictureGenerateGraph.invoke({
            diaryText: "复杂日记",
            extractedStoryBoard: mockStoryBoard,
        });

        expect(llmInvoke).toHaveBeenCalledTimes(3);
        expect(toolInvokeMock).not.toHaveBeenCalled();
        expect(result.generatedPictures).toBeUndefined();
        expect(result.currentIteration).toBe(3);
    });

    it("工具失败：应返回解析失败的错误对象", async () => {
        const mockStoryBoard = {
            StoryBoard: {
                title: "测试",
                panelCount: 1,
                panels: [{ panelNumber: 1, sceneDescription: "scene" }],
            },
        };

        const prompts = ["p1", "p2", "p3", "p4"];

        // LLM 要求调用工具
        llmInvoke.mockResolvedValue(
            new AIMessage({
                content: "call tool",
                tool_calls: [
                    {
                        id: "t2",
                        type: "tool_call",
                        name: "fal_ai_image_generation",
                        args: { input: JSON.stringify(prompts) },
                    },
                ],
            })
        );

        // 工具抛错（或返回非 JSON 字符串），会被 handleToolResult 捕获并包装为解析失败文案
        toolInvokeMock.mockRejectedValue(new Error("Fal.ai API error"));

        const result = await pictureGenerateGraph.invoke({
            diaryText: "测试日记",
            extractedStoryBoard: mockStoryBoard,
        });

        expect(result.generatedPictures).toEqual({
            PictureGenerateJson: {
                prompts: [],
                images: [],
                total_time: 0,
                success_count: 0,
                error_count: 1,
                errors: [expect.stringContaining("解析工具结果失败:")],
            },
        });
    });

    it("支持不同面板数量：应正确生成6格漫画", async () => {
        const diaryText = "今天经历了很多事情。";
        const mockStoryBoard = {
            StoryBoard: {
                title: "忙碌的一天",
                panelCount: 6,
                panels: [
                    { panelNumber: 1, sceneDescription: "morning scene" },
                    { panelNumber: 2, sceneDescription: "afternoon scene" },
                    { panelNumber: 3, sceneDescription: "evening scene" },
                    { panelNumber: 4, sceneDescription: "night scene" },
                    { panelNumber: 5, sceneDescription: "reflection moment" },
                    { panelNumber: 6, sceneDescription: "conclusion" },
                ],
            },
        };

        const prompts = [
            "Style A, morning light, detailed",
            "Style A, afternoon activity, detailed",
            "Style A, evening atmosphere, detailed",
            "Style A, night time, detailed",
            "Style A, quiet reflection, detailed",
            "Style A, peaceful conclusion, detailed"
        ];
        const images = [
            { url: "https://example.com/1.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
            { url: "https://example.com/2.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
            { url: "https://example.com/3.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
            { url: "https://example.com/4.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
            { url: "https://example.com/5.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
            { url: "https://example.com/6.jpg", width: 1024, height: 1024, content_type: "image/jpeg" }
        ];

        // 模拟 LLM 返回包含 6 个 tool_calls 的 AIMessage
        llmInvoke.mockResolvedValue(new AIMessage({
            content: "Generating 6 prompts...",
            tool_calls: [{
                type: "tool_call",
                id: "t1",
                name: "fal_ai_image_generation",
                args: { input: JSON.stringify(prompts) }
            }]
        }));

        // 模拟工具返回成功结果
        const mockToolResponse = JSON.stringify({
            results: prompts.map((prompt, index) => ({
                prompt,
                images: [images[index]],
                seed: 12345 + index,
                timings: { inference: 4.0 },
                has_nsfw_concepts: [false]
            })),
            total_time: 6000,
            success_count: 6,
            error_count: 0,
            errors: []
        });
        toolInvokeMock.mockResolvedValue(mockToolResponse);

        // 2. 执行 (Act)
        const result = await pictureGenerateGraph.invoke({
            diaryText,
            extractedStoryBoard: mockStoryBoard,
        });

        // 3. 断言 (Assert)
        expect(llmInvoke).toHaveBeenCalledTimes(1);
        expect(toolInvokeMock).toHaveBeenCalledTimes(1);

        // 验证LLM调用时提到了6个提示词
        const llmCallArgs = llmInvoke.mock.calls[0][0];
        expect(llmCallArgs[1].content).toContain("generate 6 optimized image prompts");

        // 验证工具调用参数包含6个提示词
        const firstCall = toolInvokeMock.mock.calls[0];
        expect(firstCall[0]).toMatchObject({
            args: { input: JSON.stringify(prompts) },
            name: "fal_ai_image_generation",
            type: "tool_call"
        });

        expect(result.generatedPictures).toEqual({
            PictureGenerateJson: {
                prompts,
                images,
                total_time: 6000,
                success_count: 6,
                error_count: 0,
                errors: [],
            },
        });
        expect(result.currentIteration).toBe(1);
    });

    it("达到最大迭代次数：应在+1后结束", async () => {
        const mockStoryBoard = {
            StoryBoard: {
                title: "测试",
                panelCount: 1,
                panels: [{ panelNumber: 1, sceneDescription: "scene" }],
            },
        };

        // LLM 不产生 tool_calls
        llmInvoke.mockResolvedValue(new AIMessage({ content: "invalid" }));

        const result = await pictureGenerateGraph.invoke({
            diaryText: "测试日记",
            extractedStoryBoard: mockStoryBoard,
            currentIteration: 3,
        });

        // 本次仍会调用一次模型使计数 +1，然后结束
        expect(result.currentIteration).toBe(4);
    });
});
