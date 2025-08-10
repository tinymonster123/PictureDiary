export interface StitchingInput {
    storyBoard: {
        title: string;
        panelCount: number;
        panels: {
            panelNumber: number;
            sceneDescription: string;
        }[];
    };
    generatedPictures: {
        prompts: string[];
        images: {
            url: string;
            width: number;
            height: number;
            content_type: string;
        }[];
        total_time: number;
        success_count: number;
        error_count: number;
        errors: string[];
    };
}

export interface StitchingOutput {
    finalImageUrl: string;
    width: number;
    height: number;
    layout: {
        type: "2x2" | "3x2" | "1x4" | "2x3" | "4x2";
        panelSize: {
            width: number;
            height: number;
        };
        spacing: number;
        borderWidth: number;
    };
    processingTime: number;
    success: boolean;
    error?: string;
}

export interface PanelLayout {
    x: number;
    y: number;
    width: number;
    height: number;
    panelNumber: number;
}

export interface ComicLayout {
    type: "2x2" | "3x2" | "1x4" | "2x3" | "4x2";
    canvasWidth: number;
    canvasHeight: number;
    panels: PanelLayout[];
    spacing: number;
    borderWidth: number;
    backgroundColor: string;
    titleHeight: number;
}