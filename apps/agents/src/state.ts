import { Annotation } from "@langchain/langgraph";
import { SkeletonJson } from "./skeleton/type.js";
import { EmotionJson } from "./emotion_extractor/type.js";
import { StoryBoardJson } from "./story_board/type.js";
import { PictureGenerateJson } from "./picture_generate/type.js";
import { StitchingOutput } from "./stitching/type.js";

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
  storyboard: Annotation<StoryBoardJson | null>({
    reducer: (x, y) => y || x || null,
    default: () => null,
  }),

  // Picture_Generate 输出
  generatedImages: Annotation<PictureGenerateJson | null>({
    reducer: (x, y) => y || x || null,
    default: () => null,
  }),

  // Stitching 输出
  finalResult: Annotation<StitchingOutput | null>({
    reducer: (x, y) => y || x || null,
    default: () => null,
  }),

  // 流程控制 - 使用 reducer 处理并行更新
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
      finalStitched: false,
    }),
  }),

  // 步骤控制 - 使用 reducer 处理并行更新
  currentStep: Annotation<string>({
    reducer: (x, y) => y || x || "start",
    default: () => "start",
  }),
});
