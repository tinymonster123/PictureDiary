// 图片生成相关类型定义

export type GeneratedImage = {
    url: string;
    width: number;
    height: number;
    content_type: string;
};

export type PictureGenerateJson = {
    prompts: string[];
    images: GeneratedImage[];
    total_time: number;
    success_count: number;
    error_count: number;
    errors: string[];
};

// Fal.ai API 相关类型
export interface ImageGenerationParams {
    prompt: string;
    image_size?: {
        width: number;
        height: number;
    };
    num_inference_steps?: number;
    guidance_scale?: number;
    num_images?: number;
    seed?: number;
}

export interface GenerateImagesRequest {
    prompts: string[];
    model?: string;
    image_size?: {
        width: number;
        height: number;
    };
    num_inference_steps?: number;
    guidance_scale?: number;
    seed?: number;
}

export interface FalApiResponse {
    images: GeneratedImage[];
    timings: Record<string, number>;
    seed: number;
    has_nsfw_concepts: boolean[];
    prompt: string;
}

export interface GenerateImagesResponse {
    results: {
        prompt: string;
        images: GeneratedImage[];
        seed: number;
        timings: Record<string, number>;
        has_nsfw_concepts: boolean[];
    }[];
    total_time: number;
    success_count: number;
    error_count: number;
    errors: string[];
}

export interface QueueStatusResponse {
    status: 'IN_PROGRESS' | 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
    response_url?: string;
    logs?: string[];
}
