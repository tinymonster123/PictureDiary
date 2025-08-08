import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AIMessage } from "@langchain/core/messages";
import { skeletonGraph } from "../graph.js";
import { loadChatMoonShot } from "../../utils.js";
import { SkeletonJson } from "../type.js";

// 模拟 utils 模块，特别是 loadChatMoonShot 函数
// 这可以防止在测试中进行真实的 API 调用
jest.mock("../../utils.js", () => ({
    loadChatMoonShot: jest.fn(),
}));

describe("skeletonGraph", () => {
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

    it("应该在第一次尝试时就成功提取骨架并结束", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "今天天气晴朗，我和小明去了公园，看到了一只可爱的小猫。";
        const mockSkeleton: SkeletonJson = {
            scenes: ["在公园里遇到小猫"],
            characters: [{ name: "小明", description: "我的朋友" }],
            objects: ["小猫"],
            setting: "晴天的公园",
        };

        // 模拟模型返回一个包含有效 JSON 的 AIMessage
        mockInvoke.mockResolvedValue(
            new AIMessage({
                content: `\`\`\`json\n${JSON.stringify(mockSkeleton, null, 2)}\n\`\`\``,
            }),
        );

        // 2. 执行 (Act)
        const result = await skeletonGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型调用被执行了一次
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        // 验证最终状态中的骨架与我们模拟的相符
        expect(result.extractedSkeleton).toEqual(mockSkeleton);
        // 验证迭代次数为 1
        expect(result.currentIteration).toBe(1);
    });

    it("如果模型第一次返回无效数据，应该重试并成功", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "这是一篇复杂的日记，需要模型思考一下。";
        const mockSkeleton: SkeletonJson = {
            scenes: ["第二次尝试成功"],
            characters: [],
            objects: [],
            setting: "测试环境",
        };

        // 第一次调用返回无效数据，第二次返回有效 JSON
        mockInvoke
            .mockResolvedValueOnce(new AIMessage({ content: "抱歉，我无法理解。" }))
            .mockResolvedValueOnce(
                new AIMessage({
                    content: `\`\`\`json\n${JSON.stringify(mockSkeleton)}\n\`\`\``,
                }),
            );

        // 2. 执行 (Act)
        const result = await skeletonGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型被调用了两次
        expect(mockInvoke).toHaveBeenCalledTimes(2);
        // 验证最终提取的骨架是第二次返回的结果
        expect(result.extractedSkeleton).toEqual(mockSkeleton);
        // 验证迭代次数为 2
        expect(result.currentIteration).toBe(2);
    });

    it("如果模型始终无法返回有效 JSON，应该在 3 次迭代后结束", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "这是一篇模型完全无法理解的日记。";

        // 模拟模型始终返回无效数据
        mockInvoke.mockResolvedValue(
            new AIMessage({ content: "我真的不知道怎么处理这个..." }),
        );

        // 2. 执行 (Act)
        const result = await skeletonGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型被调用了 3 次（达到最大迭代次数）
        expect(mockInvoke).toHaveBeenCalledTimes(3);
        // 验证最终骨架为 null
        expect(result.extractedSkeleton).toBeNull();
        // 验证最终迭代次数为 3
        expect(result.currentIteration).toBe(3);
    });
});