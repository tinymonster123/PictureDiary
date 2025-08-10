import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";
import { StitchingInput, StitchingOutput, ComicLayout } from "./type.js";
import { calculateLayout, validateLayout } from "./layout.js";
import { CANVAS_CONFIG } from "./config.js";

/**
 * 图片拼接工具 - 将多个生成的图片组合成漫画
 */
export class ImageStitchingTool extends Tool {
    static lc_name(): string {
        return "ImageStitchingTool";
    }

    description = "将生成的多张图片拼接成一张完整的漫画图片，支持多种布局（2x2、3x2等），添加标题和边框装饰";

    name = "image_stitching";

    schema = z.object({
        input: z.string().optional().describe("包含故事板和生成图片数据的JSON字符串")
    }).transform((obj) => obj.input ?? "");

    protected async _call(
        input: string,
        _runManager?: CallbackManagerForToolRun
    ): Promise<string> {
        try {
            console.log("开始图片拼接处理...");
            const startTime = Date.now();

            // 解析输入数据
            let inputData: StitchingInput;
            try {
                inputData = JSON.parse(input);
            } catch (error) {
                throw new Error(`输入数据格式错误: ${error}`);
            }

            // 验证输入数据
            this.validateInput(inputData);

            // 计算布局
            const layout = calculateLayout(inputData.storyBoard.panelCount);
            const layoutValidation = validateLayout(layout);
            if (!layoutValidation.valid) {
                throw new Error(`布局计算失败: ${layoutValidation.error}`);
            }

            console.log(`使用布局: ${layout.type} (${layout.canvasWidth}x${layout.canvasHeight})`);

            // 下载所有图片
            const images = await this.downloadImages(inputData.generatedPictures.images);

            // 创建画布并拼接
            const finalImageBuffer = await this.stitchImages(
                inputData.storyBoard,
                images,
                layout
            );

            // 这里应该上传到对象存储，暂时返回base64
            const base64Image = finalImageBuffer.toString('base64');
            const dataUrl = `data:${CANVAS_CONFIG.OUTPUT_FORMAT};base64,${base64Image}`;

            const processingTime = Date.now() - startTime;

            const result: StitchingOutput = {
                finalImageUrl: dataUrl, // 在实际部署中，这应该是对象存储的URL
                width: layout.canvasWidth,
                height: layout.canvasHeight,
                layout: {
                    type: layout.type,
                    panelSize: {
                        width: layout.panels[0]?.width || 0,
                        height: layout.panels[0]?.height || 0
                    },
                    spacing: layout.spacing,
                    borderWidth: layout.borderWidth
                },
                processingTime,
                success: true
            };

            console.log(`图片拼接完成，耗时 ${processingTime}ms`);
            return JSON.stringify(result);

        } catch (error) {
            console.error("图片拼接失败:", error);

            const errorResult: StitchingOutput = {
                finalImageUrl: "",
                width: 0,
                height: 0,
                layout: {
                    type: "2x2",
                    panelSize: { width: 0, height: 0 },
                    spacing: 0,
                    borderWidth: 0
                },
                processingTime: Date.now() - Date.now(),
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };

            return JSON.stringify(errorResult);
        }
    }

    /**
     * 验证输入数据
     */
    private validateInput(input: StitchingInput): void {
        if (!input.storyBoard) {
            throw new Error("缺少故事板数据");
        }

        if (!input.generatedPictures) {
            throw new Error("缺少生成的图片数据");
        }

        if (!input.storyBoard.panels || input.storyBoard.panels.length === 0) {
            throw new Error("故事板没有有效的面板");
        }

        if (!input.generatedPictures.images || input.generatedPictures.images.length === 0) {
            throw new Error("没有可用的生成图片");
        }

        if (input.generatedPictures.images.length < input.storyBoard.panelCount) {
            console.warn(`图片数量(${input.generatedPictures.images.length})少于面板数量(${input.storyBoard.panelCount})`);
        }
    }

    /**
     * 下载图片
     */
    private async downloadImages(imageUrls: { url: string; width: number; height: number; content_type: string }[]) {
        console.log(`开始下载 ${imageUrls.length} 张图片...`);

        const downloadPromises = imageUrls.map(async (imageData, index) => {
            try {
                console.log(`下载图片 ${index + 1}: ${imageData.url}`);
                const image = await loadImage(imageData.url);
                return image;
            } catch (error) {
                console.error(`图片 ${index + 1} 下载失败:`, error);
                // 创建一个占位图片
                const canvas = createCanvas(400, 400);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, 400, 400);
                ctx.fillStyle = '#999';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('图片加载失败', 200, 200);
                return canvas;
            }
        });

        const images = await Promise.all(downloadPromises);
        console.log(`图片下载完成，成功 ${images.length} 张`);
        return images;
    }

    /**
     * 拼接图片
     */
    private async stitchImages(
        storyBoard: StitchingInput['storyBoard'],
        images: any[],
        layout: ComicLayout
    ): Promise<Buffer> {
        console.log("开始创建画布并拼接图片...");

        // 创建画布
        const canvas = createCanvas(layout.canvasWidth, layout.canvasHeight);
        const ctx = canvas.getContext('2d');

        // 绘制背景
        ctx.fillStyle = layout.backgroundColor;
        ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);

        // 绘制标题
        if (storyBoard.title) {
            this.drawTitle(ctx, storyBoard.title, layout);
        }

        // 绘制每个面板
        for (let i = 0; i < layout.panels.length; i++) {
            const panel = layout.panels[i];
            const image = images[i];

            if (image) {
                this.drawPanel(ctx, image, panel, layout);
            } else {
                // 绘制空面板
                this.drawEmptyPanel(ctx, panel, layout);
            }
        }

        console.log("画布绘制完成");
        return canvas.toBuffer('image/png');
    }

    /**
     * 绘制标题
     */
    private drawTitle(ctx: CanvasRenderingContext2D, title: string, layout: ComicLayout): void {
        ctx.save();

        // 标题样式
        ctx.fillStyle = CANVAS_CONFIG.TITLE_COLOR;
        ctx.font = `bold ${CANVAS_CONFIG.TITLE_FONT_SIZE}px ${CANVAS_CONFIG.TITLE_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 绘制标题
        const titleX = layout.canvasWidth / 2;
        const titleY = CANVAS_CONFIG.OUTER_MARGIN + layout.titleHeight / 2;

        ctx.fillText(title, titleX, titleY);

        ctx.restore();
    }

    /**
     * 绘制面板
     */
    private drawPanel(ctx: CanvasRenderingContext2D, image: any, panel: any, layout: ComicLayout): void {
        ctx.save();

        // 绘制面板背景
        ctx.fillStyle = CANVAS_CONFIG.PANEL_BG_COLOR;
        ctx.fillRect(panel.x, panel.y, panel.width, panel.height);

        // 绘制图片（保持纵横比，居中裁剪）
        const imgAspectRatio = image.width / image.height;
        const panelAspectRatio = panel.width / panel.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspectRatio > panelAspectRatio) {
            // 图片更宽，以高度为准
            drawHeight = panel.height;
            drawWidth = drawHeight * imgAspectRatio;
            drawX = panel.x - (drawWidth - panel.width) / 2;
            drawY = panel.y;
        } else {
            // 图片更高，以宽度为准
            drawWidth = panel.width;
            drawHeight = drawWidth / imgAspectRatio;
            drawX = panel.x;
            drawY = panel.y - (drawHeight - panel.height) / 2;
        }

        // 裁剪到面板区域
        ctx.save();
        ctx.beginPath();
        ctx.rect(panel.x, panel.y, panel.width, panel.height);
        ctx.clip();

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // 绘制边框
        if (layout.borderWidth > 0) {
            ctx.strokeStyle = CANVAS_CONFIG.BORDER_COLOR;
            ctx.lineWidth = layout.borderWidth;
            ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
        }

        ctx.restore();
    }

    /**
     * 绘制空面板
     */
    private drawEmptyPanel(ctx: CanvasRenderingContext2D, panel: any, layout: ComicLayout): void {
        ctx.save();

        // 绘制灰色背景
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(panel.x, panel.y, panel.width, panel.height);

        // 绘制提示文字
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `面板 ${panel.panelNumber}`,
            panel.x + panel.width / 2,
            panel.y + panel.height / 2
        );

        // 绘制边框
        if (layout.borderWidth > 0) {
            ctx.strokeStyle = CANVAS_CONFIG.BORDER_COLOR;
            ctx.lineWidth = layout.borderWidth;
            ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
        }

        ctx.restore();
    }
}

/**
 * 创建工具数组，供 ToolNode 使用
 */
export const TOOLS = [new ImageStitchingTool()];
