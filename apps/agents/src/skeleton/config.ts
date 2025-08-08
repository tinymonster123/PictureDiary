import { AgentConfigurationSchema } from "../config.js";
import { Annotation } from "@langchain/langgraph";

export const SkeletonState = Annotation.Root({
    ...AgentConfigurationSchema.spec,
    diaryText: Annotation<string>(),
    extractedSkeleton: Annotation<{
        scenes: string[],
        characters: {
            name: string,
            description: string,
        }[],
        objects: string[],
        setting: string,
    } | null>,
    currentIteration: Annotation<number>(),
})
