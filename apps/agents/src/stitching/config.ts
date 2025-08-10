// 布局配置常量
export const LAYOUT_CONFIGS = {
    // 4格漫画：2x2
    "2x2": {
        type: "2x2" as const,
        rows: 2,
        cols: 2,
        aspectRatio: 1.0, // 正方形
    },
    // 6格漫画：3x2
    "3x2": {
        type: "3x2" as const,
        rows: 2,
        cols: 3,
        aspectRatio: 1.5, // 宽一些
    },
    // 4格漫画：1x4（垂直条漫）
    "1x4": {
        type: "1x4" as const,
        rows: 4,
        cols: 1,
        aspectRatio: 0.5, // 高瘦
    },
    // 6格漫画：2x3
    "2x3": {
        type: "2x3" as const,
        rows: 3,
        cols: 2,
        aspectRatio: 0.67, // 竖版
    },
    // 8格漫画：4x2
    "4x2": {
        type: "4x2" as const,
        rows: 2,
        cols: 4,
        aspectRatio: 2.0, // 宽版
    }
} as const;

// 绘图配置
export const CANVAS_CONFIG = {
    // 基础尺寸（每个面板）
    PANEL_BASE_SIZE: 400,

    // 间距和边框
    PANEL_SPACING: 20,
    BORDER_WIDTH: 3,
    OUTER_MARGIN: 40,

    // 标题配置
    TITLE_HEIGHT: 80,
    TITLE_FONT_SIZE: 32,
    TITLE_FONT_FAMILY: "Arial, sans-serif",

    // 颜色配置
    BACKGROUND_COLOR: "#FFFFFF",
    BORDER_COLOR: "#333333",
    TITLE_COLOR: "#333333",
    PANEL_BG_COLOR: "#FAFAFA",

    // 输出格式
    OUTPUT_FORMAT: "image/png" as const,
    OUTPUT_QUALITY: 0.95,

    // 最大尺寸限制（防止内存问题）
    MAX_CANVAS_WIDTH: 2400,
    MAX_CANVAS_HEIGHT: 3200,
} as const;
