import { AgentConfigurationSchema } from "../config.js";
import { Annotation } from "@langchain/langgraph";

export const EmotionState = Annotation.Root({
    ...AgentConfigurationSchema.spec,
    diaryText: Annotation<string>({
        reducer: (x, y) => y || x || "",
        default: () => ""
    }),
    extractedEmotion: Annotation<{
        primaryEmotion: string;
        nuance: string;
    } | null>({
        reducer: (x, y) => y || x || null,
        default: () => null
    }),
    currentIteration: Annotation<number>({
        reducer: (x, y) => y || x || 0,
        default: () => 0
    }),
})
