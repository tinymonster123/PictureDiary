import { ComicLayout, PanelLayout } from "./type.js";
import { LAYOUT_CONFIGS, CANVAS_CONFIG } from "./config.js";

/**
 * 根据面板数量选择最佳布局
 */
export const selectLayout = (panelCount: number): keyof typeof LAYOUT_CONFIGS => {
    switch (panelCount) {
        case 1:
        case 2:
        case 3:
        case 4:
            return "2x2";
        case 5:
        case 6:
            return "3x2";
        case 7:
        case 8:
            return "4x2"; // 8格使用4x2布局
        default:
            // 对于更多面板，使用4x2并只显示前8个
            return "4x2";
    }
}

/**
 * 计算漫画布局
 */
export const calculateLayout = (
    panelCount: number,
    layoutType?: keyof typeof LAYOUT_CONFIGS
): ComicLayout => {
    const selectedLayout = layoutType || selectLayout(panelCount);
    const config = LAYOUT_CONFIGS[selectedLayout];

    const {
        PANEL_BASE_SIZE,
        PANEL_SPACING,
        BORDER_WIDTH,
        OUTER_MARGIN,
        TITLE_HEIGHT,
        BACKGROUND_COLOR,
        MAX_CANVAS_WIDTH,
        MAX_CANVAS_HEIGHT
    } = CANVAS_CONFIG;

    // 计算基础面板尺寸
    const panelWidth = PANEL_BASE_SIZE;
    const panelHeight = PANEL_BASE_SIZE;

    // 计算画布尺寸
    const canvasWidth = Math.min(
        config.cols * panelWidth + (config.cols - 1) * PANEL_SPACING + 2 * OUTER_MARGIN,
        MAX_CANVAS_WIDTH
    );

    const canvasHeight = Math.min(
        TITLE_HEIGHT +
        config.rows * panelHeight +
        (config.rows - 1) * PANEL_SPACING +
        2 * OUTER_MARGIN,
        MAX_CANVAS_HEIGHT
    );

    // 如果超出限制，重新计算面板尺寸
    let adjustedPanelWidth: number = panelWidth;
    let adjustedPanelHeight: number = panelHeight;

    if (canvasWidth >= MAX_CANVAS_WIDTH || canvasHeight >= MAX_CANVAS_HEIGHT) {
        const availableWidth = MAX_CANVAS_WIDTH - 2 * OUTER_MARGIN - (config.cols - 1) * PANEL_SPACING;
        const availableHeight = MAX_CANVAS_HEIGHT - TITLE_HEIGHT - 2 * OUTER_MARGIN - (config.rows - 1) * PANEL_SPACING;

        adjustedPanelWidth = Math.floor(availableWidth / config.cols);
        adjustedPanelHeight = Math.floor(availableHeight / config.rows);

        // 保持面板为正方形
        const finalPanelSize = Math.min(adjustedPanelWidth, adjustedPanelHeight);
        adjustedPanelWidth = finalPanelSize;
        adjustedPanelHeight = finalPanelSize;
    }

    // 重新计算实际画布尺寸
    const finalCanvasWidth = config.cols * adjustedPanelWidth + (config.cols - 1) * PANEL_SPACING + 2 * OUTER_MARGIN;
    const finalCanvasHeight = TITLE_HEIGHT + config.rows * adjustedPanelHeight + (config.rows - 1) * PANEL_SPACING + 2 * OUTER_MARGIN;

    // 生成面板位置
    const panels: PanelLayout[] = [];
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const panelNumber = row * config.cols + col + 1;
            if (panelNumber <= panelCount) {
                panels.push({
                    x: OUTER_MARGIN + col * (adjustedPanelWidth + PANEL_SPACING),
                    y: OUTER_MARGIN + TITLE_HEIGHT + row * (adjustedPanelHeight + PANEL_SPACING),
                    width: adjustedPanelWidth,
                    height: adjustedPanelHeight,
                    panelNumber
                });
            }
        }
    }

    return {
        type: config.type,
        canvasWidth: finalCanvasWidth,
        canvasHeight: finalCanvasHeight,
        panels,
        spacing: PANEL_SPACING,
        borderWidth: BORDER_WIDTH,
        backgroundColor: BACKGROUND_COLOR,
        titleHeight: TITLE_HEIGHT
    };
}

/**
 * 验证布局是否合理
 */
export const validateLayout = (layout: ComicLayout): { valid: boolean; error?: string } => {
    if (layout.canvasWidth <= 0 || layout.canvasHeight <= 0) {
        return { valid: false, error: "画布尺寸无效" };
    }

    if (layout.panels.length === 0) {
        return { valid: false, error: "没有有效的面板" };
    }

    // 检查面板是否超出画布
    for (const panel of layout.panels) {
        if (panel.x + panel.width > layout.canvasWidth ||
            panel.y + panel.height > layout.canvasHeight) {
            return { valid: false, error: `面板 ${panel.panelNumber} 超出画布范围` };
        }
    }

    return { valid: true };
}
