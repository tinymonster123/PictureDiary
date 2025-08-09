import { StateGraph, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { GraphState } from "./state.js";
import { skeletonGraph } from "./skeleton/graph.js";
import { emotionGraph } from "./emotion_extractor/graph.js";
import { storyBoardGraph } from "./story_board/graph.js";
import { pictureGenerateGraph } from "./picture_generate/graph.js";
import { stitchImages } from "./stitching/index.js";
import { StitchingInput, StitchingOutput } from "./stitching/type.js";

/**
 * 骨架提取节点
 */
const skeletonExtractor = async (
  state: typeof GraphState.State
): Promise<typeof GraphState.Update> => {
  console.log("开始骨架提取...");

  try {
    const result = await skeletonGraph.invoke({
      diaryText: state.originalText,
    });
    return {
      skeleton: result.extractedSkeleton,
      processingStatus: {
        ...state.processingStatus,
        skeletonDone: true,
      },
      currentStep: "skeleton_completed",
    };
  } catch (error) {
    console.error("骨架提取失败:", error);
    return {
      skeleton: null,
      processingStatus: {
        ...state.processingStatus,
        skeletonDone: false,
      },
      currentStep: "skeleton_failed",
    };
  }
};

/**
 * 情感提取节点
 */
const emotionExtractor = async (
  state: typeof GraphState.State
): Promise<typeof GraphState.Update> => {
  console.log("开始情感提取...");

  try {
    const result = await emotionGraph.invoke({ diaryText: state.originalText });
    return {
      emotions: result.extractedEmotion,
      processingStatus: {
        ...state.processingStatus,
        emotionsDone: true,
      },
      currentStep: "emotion_completed",
    };
  } catch (error) {
    console.error("情感提取失败:", error);
    return {
      emotions: null,
      processingStatus: {
        ...state.processingStatus,
        emotionsDone: false,
      },
      currentStep: "emotion_failed",
    };
  }
};

/**
 * 故事板生成节点
 */
const storyboardGenerator = async (
  state: typeof GraphState.State
): Promise<typeof GraphState.Update> => {
  console.log("开始故事板生成...");

  try {
    const result = await storyBoardGraph.invoke({
      diaryText: state.originalText,
      extractedSkeleton: state.skeleton,
      extractedEmotion: state.emotions,
    });

    if (result.extractedStoryBoard) {
      return {
        storyboard: result.extractedStoryBoard,
        processingStatus: {
          ...state.processingStatus,
          storyboardDone: true,
        },
        currentStep: "storyboard_completed",
      };
    } else {
      throw new Error("故事板生成结果为空");
    }
  } catch (error) {
    console.error("故事板生成失败:", error);
    return {
      storyboard: null,
      processingStatus: {
        ...state.processingStatus,
        storyboardDone: false,
      },
      currentStep: "storyboard_failed",
    };
  }
};

/**
 * 图片生成节点
 */
const pictureGenerator = async (
  state: typeof GraphState.State
): Promise<typeof GraphState.Update> => {
  console.log("开始图片生成...");

  try {
    const result = await pictureGenerateGraph.invoke({
      extractedStoryBoard: state.storyboard
        ? { StoryBoard: state.storyboard }
        : null,
    });

    return {
      generatedImages: result.generatedPictures?.PictureGenerateJson || null,
      processingStatus: {
        ...state.processingStatus,
        imagesGenerated: true,
      },
      currentStep: "pictures_completed",
    };
  } catch (error) {
    console.error("图片生成失败:", error);
    return {
      generatedImages: null,
      processingStatus: {
        ...state.processingStatus,
        imagesGenerated: false,
      },
      currentStep: "pictures_failed",
    };
  }
};

/**
 * 图片拼接节点
 */
const imageStitcher = async (
  state: typeof GraphState.State
): Promise<typeof GraphState.Update> => {
  console.log("开始图片拼接...");

  try {
    if (!state.storyboard || !state.generatedImages) {
      throw new Error("缺少故事板或生成的图片数据");
    }

    // 构建拼接输入数据
    const stitchingInput: StitchingInput = {
      storyBoard: {
        title: state.storyboard.title || "我的日记漫画",
        panelCount:
          state.storyboard.panelCount || state.generatedImages.images.length,
        panels:
          state.storyboard.panels ||
          state.generatedImages.images.map((_, index) => ({
            panelNumber: index + 1,
            sceneDescription: `面板 ${index + 1}`,
          })),
      },
      generatedPictures: {
        prompts: state.generatedImages.prompts || [],
        images: state.generatedImages.images || [],
        total_time: state.generatedImages.total_time || 0,
        success_count: state.generatedImages.success_count || 0,
        error_count: state.generatedImages.error_count || 0,
        errors: state.generatedImages.errors || [],
      },
    };

    const result: StitchingOutput = await stitchImages(stitchingInput);

    if (result.success) {
      return {
        finalResult: result,
        processingStatus: {
          ...state.processingStatus,
          finalStitched: true,
        },
        currentStep: "stitching_completed",
      };
    } else {
      throw new Error(result.error || "拼接失败");
    }
  } catch (error) {
    console.error("图片拼接失败:", error);
    return {
      finalResult: null,
      processingStatus: {
        ...state.processingStatus,
        finalStitched: false,
      },
      currentStep: "stitching_failed",
    };
  }
};

/**
 * 路由函数 - 决定下一步执行哪个节点
 */
// const _routeWorkflow = (state: typeof GraphState.State): string => {
//   const { processingStatus, currentStep } = state;

//   // 如果是初始状态，开始并行处理骨架和情感提取
//   if (!currentStep || currentStep === "start") {
//     return "skeleton_extraction"; // 将启动两个并行节点
//   }

//   // 骨架和情感提取完成后，进行故事板生成
//   if (
//     processingStatus.skeletonDone &&
//     processingStatus.emotionsDone &&
//     !processingStatus.storyboardDone
//   ) {
//     return "storyboard_generation";
//   }

//   // 故事板完成后，进行图片生成
//   if (processingStatus.storyboardDone && !processingStatus.imagesGenerated) {
//     return "picture_generation";
//   }

//   // 图片生成完成后，进行拼接
//   if (processingStatus.imagesGenerated && !processingStatus.finalStitched) {
//     return "image_stitching";
//   }

//   // 全部完成
//   if (processingStatus.finalStitched) {
//     return END;
//   }

//   // 默认结束（包括失败情况）
//   return END;
// };

/**
 * 创建主要的工作流图
 */
export const createWorkflowGraph = () => {
  const workflow = new StateGraph(GraphState)
    // 添加节点
    .addNode("skeleton_extraction", skeletonExtractor)
    .addNode("emotion_extraction", emotionExtractor)
    .addNode("storyboard_generation", storyboardGenerator)
    .addNode("picture_generation", pictureGenerator)
    .addNode("image_stitching", imageStitcher)

    // 设置并行入口点
    .addEdge("__start__", "skeleton_extraction")
    .addEdge("__start__", "emotion_extraction")

    // 添加条件边
    .addEdge(
      ["skeleton_extraction", "emotion_extraction"],
      "storyboard_generation"
    )
    .addEdge("storyboard_generation", "picture_generation")
    .addEdge("picture_generation", "image_stitching")
    .addEdge("image_stitching", END);

  return workflow.compile();
};

// 导出主图
export const mainWorkflowGraph = createWorkflowGraph();

/**
 * 工作流的入口函数
 */
export const processWorkflow = async (
  originalText: string,
  config?: RunnableConfig
): Promise<typeof GraphState.State> => {
  const initialState: typeof GraphState.State = {
    originalText,
    skeleton: null,
    emotions: null,
    storyboard: null,
    generatedImages: null,
    finalResult: null,
    currentStep: "start",
    processingStatus: {
      skeletonDone: false,
      emotionsDone: false,
      storyboardDone: false,
      imagesGenerated: false,
      finalStitched: false,
    },
  };

  console.log("开始处理工作流...");
  const result = await mainWorkflowGraph.invoke(initialState, config);
  console.log("工作流处理完成");

  return result;
};
