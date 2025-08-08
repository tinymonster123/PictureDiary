import { Annotation } from "@langchain/langgraph";
import { SkeletonJson } from "./skeleton/type.js";
import { EmotionJson } from "./emotion_extractor/type.js";

// 定义状态结构
export const GraphState = Annotation.Root({
    // 日记输入
    originalText: Annotation<string>(),

    // SKeleton_Extractor 输出
    skeleton: Annotation<SkeletonJson | null>({
        reducer: (x, y) => y || x || null,
        default: () => null,
    }),

    // Emotion_Extractor 输出  
    emotions: Annotation<EmotionJson | null>({
        reducer: (x, y) => y || x || null,
        default: () => null,
    }),

    // StoryBoard 输出
    storyboard: Annotation<Array<Record<string, any>>>({
        reducer: (x, y) => y || x || [],
        default: () => []
    }),

    // Picture_Generate 输出
    generatedImages: Annotation<string[]>({
        reducer: (x, y) => y || x || [],
        default: () => []
    }),

    // Stitching 输出
    finalResult: Annotation<string>(),

    // 步骤控制
    currentStep: Annotation<string>(),

    // 流程控制
    processingStatus: Annotation<{
        skeletonDone: boolean;
        emotionsDone: boolean;
        storyboardDone: boolean;
        imagesGenerated: boolean;
        finalStitched: boolean;
    }>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({
            skeletonDone: false,
            emotionsDone: false,
            storyboardDone: false,
            imagesGenerated: false,
            finalStitched: false
        })
    }),

});