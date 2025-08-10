import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AIMessage } from "@langchain/core/messages";
import { emotionGraph } from "../graph.js";
import { loadChatMoonShot } from "../../utils.js";
import { EmotionJson } from "../type.js";

// 模拟 utils 模块，特别是 loadChatMoonShot 函数
// 这可以防止在测试中进行真实的 API 调用
jest.mock("../../utils.js", () => ({
    loadChatMoonShot: jest.fn(),
}));

describe("emotionGraph", () => {
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

    it("应该在第一次尝试时就成功提取情感并结束", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "今天和朋友们去爬山，累到腿软，但山顶的风真的好舒服！我们拍了好多搞怪的照片，晚上一起吃烤肉，聊到半夜。真是完美的一天！";
        const mockEmotion: EmotionJson = {
            primaryEmotion: "Joy",
            nuance: "An energetic and heartwarming sense of fulfillment after a day of friendship and adventure."
        };

        // 模拟模型返回一个包含有效 JSON 的 AIMessage
        mockInvoke.mockResolvedValue(
            new AIMessage({
                content: `\`\`\`json\n${JSON.stringify(mockEmotion, null, 2)}\n\`\`\``,
            }),
        );

        // 2. 执行 (Act)
        const result = await emotionGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型调用被执行了一次
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        // 验证最终状态中的情感与我们模拟的相符
        expect(result.extractedEmotion).toEqual(mockEmotion);
        // 验证迭代次数为 1
        expect(result.currentIteration).toBe(1);
    });

    it("如果模型第一次返回无效数据，应该重试并成功", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "下了一整天的雨，没出门。我在窗边看书，听着雨声滴答，时间过得好慢。想起了很多小时候的事，有点怀念，又有点说不出的平静。";
        const mockEmotion: EmotionJson = {
            primaryEmotion: "Nostalgia",
            nuance: "A quiet and contemplative sense of peace, tinged with a gentle longing for the past."
        };

        // 第一次调用返回无效数据，第二次返回有效 JSON
        mockInvoke
            .mockResolvedValueOnce(new AIMessage({ content: "抱歉，我无法理解这种情感。" }))
            .mockResolvedValueOnce(
                new AIMessage({
                    content: `\`\`\`json\n${JSON.stringify(mockEmotion)}\n\`\`\``,
                }),
            );

        // 2. 执行 (Act)
        const result = await emotionGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型被调用了两次
        expect(mockInvoke).toHaveBeenCalledTimes(2);
        // 验证最终提取的情感是第二次返回的结果
        expect(result.extractedEmotion).toEqual(mockEmotion);
        // 验证迭代次数为 2
        expect(result.currentIteration).toBe(2);
    });

    it("如果模型始终无法返回有效 JSON，应该在 3 次迭代后结束", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "这是一篇模型完全无法理解情感的日记。";

        // 模拟模型始终返回无效数据
        mockInvoke.mockResolvedValue(
            new AIMessage({ content: "我真的不知道这是什么情感..." }),
        );

        // 2. 执行 (Act)
        const result = await emotionGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型被调用了 3 次（达到最大迭代次数）
        expect(mockInvoke).toHaveBeenCalledTimes(3);
        // 验证最终情感为 null
        expect(result.extractedEmotion).toBeNull();
        // 验证最终迭代次数为 3
        expect(result.currentIteration).toBe(3);
    });

    it("应该正确处理中性情感的情况", async () => {
        // 1. 准备 (Arrange)
        const diaryText = "今天去办了银行卡，排队等了20分钟，办完就回家了。";
        const mockEmotion: EmotionJson = {
            primaryEmotion: "Neutral",
            nuance: "A factual, observational account of the day's events."
        };

        // 模拟模型返回中性情感
        mockInvoke.mockResolvedValue(
            new AIMessage({
                content: `\`\`\`json\n${JSON.stringify(mockEmotion, null, 2)}\n\`\`\``,
            }),
        );

        // 2. 执行 (Act)
        const result = await emotionGraph.invoke({ diaryText });

        // 3. 断言 (Assert)
        // 验证模型调用被执行了一次
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        // 验证能够正确识别中性情感
        expect(result.extractedEmotion).toEqual(mockEmotion);
        expect(result.extractedEmotion?.primaryEmotion).toBe("Neutral");
        // 验证迭代次数为 1
        expect(result.currentIteration).toBe(1);
    });
});
