import { AgentConfigurationSchema } from "../config.js";
import { MessagesAnnotation } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { PictureGenerateJson } from "./type.js";
import { StoryBoardJson } from "../story_board/type.js";

export const PictureGenerateState = Annotation.Root({
    ...AgentConfigurationSchema.spec,
    ...MessagesAnnotation.spec,
    diaryText: Annotation<string>(),
    extractedStoryBoard: Annotation<{
        StoryBoard: StoryBoardJson;
    } | null>(),
    generatedPictures: Annotation<{
        PictureGenerateJson: PictureGenerateJson;
    } | null>(),
    currentIteration: Annotation<number>(),
})
