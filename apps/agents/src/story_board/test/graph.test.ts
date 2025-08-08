import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AIMessage } from "@langchain/core/messages";
import { storyBoardGraph } from "../graph.js";
import { loadChatMoonShot } from "../../utils.js";
import { StoryBoardJson } from "../type.js";

// 模拟 utils 模块，特别是 loadChatMoonShot 函数
// 这可以防止在测试中进行真实的 API 调用
jest.mock("../../utils.js", () => ({
    loadChatMoonShot: jest.fn(),
}));

describe("storyBoardGraph", () => {
    // 定义一个模拟的 invoke 函数，我们可以在每个测试中控制它的行为
    const mockInvoke = jest.fn() as jest.MockedFunction<any>;

    // 在每个测试用例运行前，重置所有模拟
    beforeEach(() => {
        jest.clearAllMocks();
        // 将 loadChatMoonShot 的模拟实现设置为返回一个包含我们可控的 invoke 函数的对象
        (loadChatMoonShot as jest.MockedFunction<typeof loadChatMoonShot>).mockResolvedValue({
            invoke: mockInvoke,
        } as any);
    });

    it("应该在第一次尝试时就成功提取分镜并结束", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "今天天气晴朗，我和小明去了公园，看到了一只可爱的小猫。";
        const mockSkeleton = {
            scenes: ["在公园里遇到小猫"],
            characters: [{ name: "小明", description: "我的朋友" }],
            objects: ["小猫"],
            setting: "晴天的公园",
        };
        const mockEmotion = {
            primaryEmotion: "Joy",
            nuance: "A pleasant day with friends and cute animals"
        };
        const mockStoryBoard: StoryBoardJson = {
            title: "公园里的小猫",
            panelCount: 4,
            panels: [
                {
                    panelNumber: 1,
                    sceneDescription: "Wide shot of a sunny park with two people walking."
                },
                {
                    panelNumber: 2,
                    sceneDescription: "Close-up of a cute cat sitting on the grass."
                },
                {
                    panelNumber: 3,
                    sceneDescription: "Medium shot of the two people approaching the cat."
                },
                {
                    panelNumber: 4,
                    sceneDescription: "Final shot of the cat being petted by the people."
                }
            ]
        };

        // 模拟模型返回一个包含有效 JSON 的 AIMessage
        mockInvoke.mockResolvedValue(
            new AIMessage({
                content: `\`\`\`json\n${JSON.stringify(mockStoryBoard, null, 2)}\n\`\`\``,
            }),
        );

        // 2. 执行 (Act)
        const result = await storyBoardGraph.invoke({
            diaryText,
            extractedSkeleton: mockSkeleton,
            extractedEmotion: mockEmotion
        });

        // 3. 断言 (Assert)
        // 验证模型调用被执行了一次
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        // 验证最终状态中的分镜与我们模拟的相符
        expect(result.extractedStoryBoard).toEqual(mockStoryBoard);
        // 验证迭代次数为 1
        expect(result.currentIteration).toBe(1);
    });

    it("如果模型第一次返回无效数据，应该重试并成功", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "这是一篇复杂的日记，需要模型思考一下。";
        const mockSkeleton = {
            scenes: ["第二次尝试成功"],
            characters: [],
            objects: [],
            setting: "测试环境",
        };
        const mockEmotion = {
            primaryEmotion: "Neutral",
            nuance: "A complex diary entry"
        };
        const mockStoryBoard: StoryBoardJson = {
            title: "复杂日记的分镜",
            panelCount: 4,
            panels: [
                {
                    panelNumber: 1,
                    sceneDescription: "First panel description."
                },
                {
                    panelNumber: 2,
                    sceneDescription: "Second panel description."
                },
                {
                    panelNumber: 3,
                    sceneDescription: "Third panel description."
                },
                {
                    panelNumber: 4,
                    sceneDescription: "Fourth panel description."
                }
            ]
        };

        // 第一次调用返回无效数据，第二次返回有效 JSON
        mockInvoke
            .mockResolvedValueOnce(new AIMessage({ content: "抱歉，我无法理解。" }))
            .mockResolvedValueOnce(
                new AIMessage({
                    content: `\`\`\`json\n${JSON.stringify(mockStoryBoard)}\n\`\`\``,
                }),
            );

        // 2. 执行 (Act)
        const result = await storyBoardGraph.invoke({
            diaryText,
            extractedSkeleton: mockSkeleton,
            extractedEmotion: mockEmotion
        });

        // 3. 断言 (Assert)
        // 验证模型被调用了两次
        expect(mockInvoke).toHaveBeenCalledTimes(2);
        // 验证最终提取的分镜是第二次返回的结果
        expect(result.extractedStoryBoard).toEqual(mockStoryBoard);
        // 验证迭代次数为 2
        expect(result.currentIteration).toBe(2);
    });

    it("如果模型始终无法返回有效 JSON，应该在 3 次迭代后结束", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "这是一篇模型完全无法理解的日记。";
        const mockSkeleton = {
            scenes: ["无法理解"],
            characters: [],
            objects: [],
            setting: "未知环境",
        };
        const mockEmotion = {
            primaryEmotion: "Confusion",
            nuance: "Model cannot understand this diary"
        };

        // 模拟模型始终返回无效数据
        mockInvoke.mockResolvedValue(
            new AIMessage({ content: "我真的不知道怎么处理这个..." }),
        );

        // 2. 执行 (Act)
        const result = await storyBoardGraph.invoke({
            diaryText,
            extractedSkeleton: mockSkeleton,
            extractedEmotion: mockEmotion
        });

        // 3. 断言 (Assert)
        // 验证模型被调用了 3 次（达到最大迭代次数）
        expect(mockInvoke).toHaveBeenCalledTimes(3);
        // 验证最终分镜为 null
        expect(result.extractedStoryBoard).toBeNull();
        // 验证最终迭代次数为 3
        expect(result.currentIteration).toBe(3);
    });

    it("应该正确处理空的骨架和情感数据", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "今天很普通。";
        const mockSkeleton = null;
        const mockEmotion = null;
        const mockStoryBoard: StoryBoardJson = {
            title: "普通的一天",
            panelCount: 4,
            panels: [
                {
                    panelNumber: 1,
                    sceneDescription: "A simple day begins."
                },
                {
                    panelNumber: 2,
                    sceneDescription: "Daily routine continues."
                },
                {
                    panelNumber: 3,
                    sceneDescription: "Afternoon activities."
                },
                {
                    panelNumber: 4,
                    sceneDescription: "Day ends quietly."
                }
            ]
        };

        // 模拟模型返回有效 JSON
        mockInvoke.mockResolvedValue(
            new AIMessage({
                content: `\`\`\`json\n${JSON.stringify(mockStoryBoard, null, 2)}\n\`\`\``,
            }),
        );

        // 2. 执行 (Act)
        const result = await storyBoardGraph.invoke({
            diaryText,
            extractedSkeleton: mockSkeleton,
            extractedEmotion: mockEmotion
        });

        // 3. 断言 (Assert)
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(result.extractedStoryBoard).toEqual(mockStoryBoard);
        expect(result.currentIteration).toBe(1);
    });
});
