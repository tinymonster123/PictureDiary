import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";
import { StitchingInput, StitchingOutput, ComicLayout } from "./type.js";
import { calculateLayout, validateLayout } from "./layout.js";
import { CANVAS_CONFIG } from "./config.js";

/**
 * 绘制空面板
 */
const drawEmptyPanel = (ctx: CanvasRenderingContext2D, panel: any, layout: ComicLayout): void => {
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

/**
 * 下载图片
 */
const downloadImages = async (imageUrls: { url: string; width: number; height: number; content_type: string }[]) => {
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
 * 绘制标题
 */
const drawTitle = (ctx: CanvasRenderingContext2D, title: string, layout: ComicLayout): void => {
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
const drawPanel = (ctx: CanvasRenderingContext2D, image: any, panel: any, layout: ComicLayout): void => {
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
 * 验证输入数据
 */
const validateInput = (input: StitchingInput): void => {
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
 * 拼接图片到画布
 */
const stitchImagesToCanvas = async (
    storyBoard: StitchingInput['storyBoard'],
    images: any[],
    layout: ComicLayout
): Promise<Buffer> => {
    console.log("开始创建画布并拼接图片...");

    // 创建画布
    const canvas = createCanvas(layout.canvasWidth, layout.canvasHeight);
    const ctx = canvas.getContext('2d');

    // 绘制背景
    ctx.fillStyle = layout.backgroundColor;
    ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);

    // 绘制标题
    if (storyBoard.title) {
        drawTitle(ctx, storyBoard.title, layout);
    }

    // 绘制每个面板
    for (let i = 0; i < layout.panels.length; i++) {
        const panel = layout.panels[i];
        const image = images[i];

        if (image) {
            drawPanel(ctx, image, panel, layout);
        } else {
            // 绘制空面板
            drawEmptyPanel(ctx, panel, layout);
        }
    }

    console.log("画布绘制完成");
    return canvas.toBuffer('image/png');
}



export const stitchImages = async (input: StitchingInput): Promise<StitchingOutput> => {
    try {
        console.log("开始图片拼接处理...");
        const startTime = Date.now();

        // 验证输入数据
        validateInput(input);

        // 计算布局
        const layout = calculateLayout(input.storyBoard.panelCount);
        const layoutValidation = validateLayout(layout);
        if (!layoutValidation.valid) {
            throw new Error(`布局计算失败: ${layoutValidation.error}`);
        }

        console.log(`使用布局: ${layout.type} (${layout.canvasWidth}x${layout.canvasHeight})`);

        // 下载所有图片
        const images = await downloadImages(input.generatedPictures.images);

        // 创建画布并拼接
        const finalImageBuffer = await stitchImagesToCanvas(
            input.storyBoard,
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
        return result;

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

        return errorResult;
    }
}