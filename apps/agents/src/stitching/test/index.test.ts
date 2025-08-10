import { describe, it, expect, jest } from "@jest/globals";
import { stitchImages } from "../index.js";
import { StitchingInput } from "../type.js";

// 模拟 canvas 模块
jest.mock("canvas", () => ({
    createCanvas: jest.fn(() => ({
        getContext: jest.fn(() => ({
            fillStyle: "",
            fillRect: jest.fn(),
            drawImage: jest.fn(),
            strokeStyle: "",
            lineWidth: 0,
            strokeRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn(),
            font: "",
            textAlign: "",
            textBaseline: "",
            fillText: jest.fn(),
        })),
        toBuffer: jest.fn(() => Buffer.from("mock-image-data")),
        width: 800,
        height: 600,
    })),
    loadImage: jest.fn(() => Promise.resolve({
        width: 400,
        height: 400,
    })),
}));

describe("stitchImages", () => {
    it("应该成功拼接图片", async () => {
        // 准备测试数据
        const input: StitchingInput = {
            storyBoard: {
                title: "美好的一天",
                panelCount: 4,
                panels: [
                    { panelNumber: 1, sceneDescription: "公园的全景" },
                    { panelNumber: 2, sceneDescription: "花朵特写" },
                    { panelNumber: 3, sceneDescription: "阅读的人" },
                    { panelNumber: 4, sceneDescription: "湖上的日落" }
                ]
            },
            generatedPictures: {
                prompts: ["prompt 1", "prompt 2", "prompt 3", "prompt 4"],
                images: [
                    { url: "https://example.com/1.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/2.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/3.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/4.jpg", width: 1024, height: 1024, content_type: "image/jpeg" }
                ],
                total_time: 5000,
                success_count: 4,
                error_count: 0,
                errors: []
            }
        };

        // 执行拼接
        const result = await stitchImages(input);

        // 验证结果
        expect(result.success).toBe(true);
        expect(result.finalImageUrl).toContain("data:image/png;base64");
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.layout.type).toBe("2x2");
        expect(result.processingTime).toBeGreaterThan(0);
    });

    it("缺少故事板数据时应该返回错误", async () => {
        const input: StitchingInput = {
            storyBoard: null as any,
            generatedPictures: {
                prompts: ["prompt 1"],
                images: [{ url: "https://example.com/1.jpg", width: 1024, height: 1024, content_type: "image/jpeg" }],
                total_time: 1000,
                success_count: 1,
                error_count: 0,
                errors: []
            }
        };

        const result = await stitchImages(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("缺少故事板数据");
    });

    it("缺少生成图片数据时应该返回错误", async () => {
        const input: StitchingInput = {
            storyBoard: {
                title: "测试",
                panelCount: 2,
                panels: [
                    { panelNumber: 1, sceneDescription: "场景1" },
                    { panelNumber: 2, sceneDescription: "场景2" }
                ]
            },
            generatedPictures: null as any
        };

        const result = await stitchImages(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("缺少生成的图片数据");
    });

    it("支持不同面板数量", async () => {
        const input: StitchingInput = {
            storyBoard: {
                title: "忙碌的一天",
                panelCount: 6,
                panels: [
                    { panelNumber: 1, sceneDescription: "早晨" },
                    { panelNumber: 2, sceneDescription: "中午" },
                    { panelNumber: 3, sceneDescription: "下午" },
                    { panelNumber: 4, sceneDescription: "傍晚" },
                    { panelNumber: 5, sceneDescription: "夜晚" },
                    { panelNumber: 6, sceneDescription: "结束" }
                ]
            },
            generatedPictures: {
                prompts: ["p1", "p2", "p3", "p4", "p5", "p6"],
                images: [
                    { url: "https://example.com/1.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/2.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/3.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/4.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/5.jpg", width: 1024, height: 1024, content_type: "image/jpeg" },
                    { url: "https://example.com/6.jpg", width: 1024, height: 1024, content_type: "image/jpeg" }
                ],
                total_time: 6000,
                success_count: 6,
                error_count: 0,
                errors: []
            }
        };

        const result = await stitchImages(input);

        expect(result.success).toBe(true);
        expect(result.layout.type).toBe("3x2"); // 6格应该使用3x2布局
    });
});
