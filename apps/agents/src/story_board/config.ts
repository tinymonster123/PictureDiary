import { AgentConfigurationSchema } from "../config.js";
import { Annotation } from "@langchain/langgraph";

export const StoryBoardState = Annotation.Root({
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
    } | null>(),
    extractedEmotion: Annotation<{
        primaryEmotion: string;
        nuance: string;
    } | null>(),
    extractedStoryBoard: Annotation<{
        title: string;
        panelCount: number;
        panels: {
            panelNumber: number;
            sceneDescription: string;
        }[];
    } | null>(),
    currentIteration: Annotation<number>(),
})
