import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { Tool } from "@langchain/core/tools";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { z } from "zod";

/**
 * Fal.ai 图片生成工具
 */
export class FalAiImageGeneration extends Tool {
    static lc_name(): string {
        return "FalAiImageGeneration";
    }

    description = "一个AI图片生成工具，能够根据1-8个文本提示词并行生成对应的图片。输入参数必须是一个包含提示词字符串的JSON数组字符串。";

    name = "fal_ai_image_generation";

    schema = z.object({
        input: z.string().optional().describe("包含提示词的JSON数组字符串，支持1-8个提示词")
    }).transform((obj) => obj.input ?? "");

    protected apiKey: string;
    protected baseUrl: string;

    constructor() {
        super();
        this.apiKey = getEnvironmentVariable("FAL_API_KEY") ?? "";
        this.baseUrl = getEnvironmentVariable("FAL_API_URL") ?? "https://queue.fal.run";

        if (!this.apiKey) {
            throw new Error(
                `未找到 Fal.ai API 密钥。请设置环境变量 "FAL_API_KEY"。`
            );
        }
    }

    protected async _call(
        input: string,
        _runManager?: CallbackManagerForToolRun
    ): Promise<string> {
        try {
            // 解析输入的 prompts
            let prompts: string[];
            try {
                prompts = JSON.parse(input);
            } catch (error) {
                throw new Error(`输入格式错误，请提供有效的JSON数组: ${error}`);
            }

            if (!Array.isArray(prompts) || prompts.length === 0) {
                throw new Error('必须提供包含有效提示词的数组');
            }

            if (prompts.length > 8) {
                throw new Error('一次最多只能生成8张图片');
            }

            const startTime = Date.now();
            const results: any[] = [];
            const errors: string[] = [];

            // 并行提交所有请求到队列
            const submitPromises = prompts.map((prompt, index) =>
                this.submitToQueue(prompt, index)
            );

            console.log('正在提交请求到队列...');
            const requestIds = await Promise.all(submitPromises);
            console.log('所有请求已提交:', requestIds);

            // 并行等待所有请求完成
            const completionPromises = requestIds.map((requestId, index) =>
                this.waitForCompletion(requestId)
                    .then(result => ({
                        index,
                        success: true,
                        result,
                        error: null
                    }))
                    .catch(error => ({
                        index,
                        success: false,
                        result: null,
                        error: error.message
                    }))
            );

            console.log('等待所有请求完成...');
            const completionResults = await Promise.all(completionPromises);

            // 处理结果
            completionResults.forEach(({ index, success, result, error }) => {
                if (success && result) {
                    results.push({
                        prompt: prompts[index],
                        images: result.images,
                        seed: result.seed,
                        timings: result.timings,
                        has_nsfw_concepts: result.has_nsfw_concepts
                    });
                } else if (error) {
                    errors.push(`提示词 ${index + 1} ("${prompts[index]}"): ${error}`);
                }
            });

            const totalTime = Date.now() - startTime;
            const response = {
                results: results.sort((a, b) =>
                    prompts.indexOf(a.prompt) - prompts.indexOf(b.prompt)
                ),
                total_time: totalTime,
                success_count: results.length,
                error_count: errors.length,
                errors
            };

            return JSON.stringify(response);

        } catch (error) {
            throw new Error(`图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 提交单个图像生成请求到队列
     */
    private async submitToQueue(prompt: string, index: number): Promise<string> {
        const payload: Record<string, unknown> = {
            prompt,
            image_size: { width: 1024, height: 1024 },
            num_inference_steps: 4,
            guidance_scale: 3.5,
            num_images: 1,
            seed: Date.now() + index
        };

        const response = await fetch(`${this.baseUrl}/fal-ai/flux/schnell`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`提交请求失败，状态码 ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (!result.request_id) {
            throw new Error('无法解析 Fal.ai 响应，请重试。');
        }

        return result.request_id;
    }

    /**
     * 检查请求状态
     */
    private async checkStatus(requestId: string): Promise<any> {
        const response = await fetch(`${this.baseUrl}/requests/${requestId}/status`, {
            headers: {
                'Authorization': `Key ${this.apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`检查状态失败，状态码 ${response.status}`);
        }

        return await response.json();
    }

    /**
     * 获取生成结果
     */
    private async getResult(requestId: string): Promise<any> {
        const response = await fetch(`${this.baseUrl}/requests/${requestId}`, {
            headers: {
                'Authorization': `Key ${this.apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`获取结果失败，状态码 ${response.status}`);
        }

        return await response.json();
    }

    /**
     * 等待请求完成
     */
    private async waitForCompletion(requestId: string): Promise<any> {
        let retries = 0;
        const maxRetries = 60;
        const retryInterval = 2000;

        while (retries < maxRetries) {
            try {
                const status = await this.checkStatus(requestId);

                if (status.status === 'COMPLETED') {
                    return await this.getResult(requestId);
                } else if (status.status === 'FAILED') {
                    throw new Error('请求处理失败');
                }

                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, retryInterval));
                retries++;
            } catch (error) {
                if (retries === maxRetries - 1) {
                    throw error;
                }
                retries++;
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }

        throw new Error('请求超时: 超过最大重试次数');
    }
}

/**
 * 创建工具数组，供 ToolNode 使用
 */
export const TOOLS = [new FalAiImageGeneration()];


