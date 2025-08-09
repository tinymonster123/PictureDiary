import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { Tool } from "@langchain/core/tools";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { z } from "zod";
import { fal } from "@fal-ai/client";

/**
 * Fal.ai 图片生成工具
 */
export class FalAiImageGeneration extends Tool {
  static lc_name(): string {
    return "FalAiImageGeneration";
  }

  description =
    "一个AI图片生成工具，能够根据1-8个文本提示词并行生成对应的图片。输入参数必须是一个包含提示词字符串的JSON数组字符串。";

  name = "fal_ai_image_generation";

  schema = z
    .object({
      input: z
        .string()
        .optional()
        .describe("包含提示词的JSON数组字符串，支持1-8个提示词"),
    })
    .transform((obj) => obj.input ?? "");

  protected apiKey: string;
  protected baseUrl: string;

  constructor() {
    super();
    this.apiKey = getEnvironmentVariable("FAL_API_KEY") ?? "";
    this.baseUrl =
      getEnvironmentVariable("FAL_API_URL") ?? "https://queue.fal.run";

    if (!this.apiKey) {
      throw new Error(`未找到 Fal.ai API 密钥。请设置环境变量 "FAL_API_KEY"。`);
    }

    // 配置 fal.ai 客户端
    fal.config({
      credentials: this.apiKey,
    });
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
        throw new Error("必须提供包含有效提示词的数组");
      }

      if (prompts.length > 8) {
        throw new Error("一次最多只能生成8张图片");
      }

      const startTime = Date.now();
      const results: any[] = [];
      const errors: string[] = [];

      console.log(`开始生成 ${prompts.length} 张图片...`);

      // 并行生成所有图片
      const generationPromises = prompts.map(async (prompt, index) => {
        try {
          console.log(`生成图片 ${index + 1}: ${prompt}`);

          // 使用更稳定的 FLUX schnell 模型，但优化为漫画风格
          const result = await fal.subscribe("fal-ai/flux/schnell", {
            input: {
              prompt: `manga style comic panel, ${prompt}, speech bubble, dialogue, expressive anime character, comic book art, clean line art, cel shading`, // 添加漫画对话风格前缀
              image_size: "square_hd",
              num_inference_steps: 4, // FLUX schnell 推荐步数
              guidance_scale: 3.5,
              num_images: 1,
              seed: Date.now() + index,
            },
            logs: true,
            onQueueUpdate: (update: any) => {
              console.log(`图片 ${index + 1} 队列状态:`, update.status);
              // 如果队列状态长时间没有变化，可以考虑添加超时逻辑
            },
          });

          console.log(`图片 ${index + 1} 生成成功:`, result);

          // 根据文档，result 包含 data 和 requestId
          const resultData = result.data as any;
          return {
            index,
            success: true,
            result: {
              prompt,
              images: resultData.images || [],
              seed: resultData.seed || Date.now(),
              timings: resultData.timings || {},
              has_nsfw_concepts: resultData.has_nsfw_concepts || [false],
            },
            error: null,
          };
        } catch (error) {
          console.log(`图片 ${index + 1} 生成失败:`, error);
          return {
            index,
            success: false,
            result: null,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      });

      console.log("等待所有图片生成完成...");
      const completionResults = await Promise.all(generationPromises);

      // 处理结果
      console.log("处理完成结果:", completionResults);
      completionResults.forEach(({ index, success, result, error }) => {
        if (success && result) {
          console.log(`成功处理提示词 ${index + 1}:`, result);
          results.push(result);
        } else if (error) {
          console.log(`处理提示词 ${index + 1} 失败:`, error);
          errors.push(`提示词 ${index + 1} ("${prompts[index]}"): ${error}`);
        }
      });

      const totalTime = Date.now() - startTime;
      const response = {
        results: results.sort(
          (a, b) => prompts.indexOf(a.prompt) - prompts.indexOf(b.prompt)
        ),
        total_time: totalTime,
        success_count: results.length,
        error_count: errors.length,
        errors,
      };

      console.log("最终工具响应:", JSON.stringify(response, null, 2));
      return JSON.stringify(response);
    } catch (error) {
      throw new Error(
        `图片生成失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }
}

/**
 * 创建工具数组，供 ToolNode 使用
 */
export const TOOLS = (() => {
  try {
    return [new FalAiImageGeneration()];
  } catch (error) {
    console.warn("创建 FalAiImageGeneration 工具失败:", error);
    return [];
  }
})();
