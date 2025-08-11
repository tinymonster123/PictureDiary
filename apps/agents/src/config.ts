import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

// 每个 agent 节点的通用 Schema
export const AgentConfigurationSchema = Annotation.Root({
  model: Annotation<string>,
  systemPrompt: Annotation<string>,
  maxIterations: Annotation<number>,
});

export const ensureAgentConfiguration = (
  config: RunnableConfig,
  defaultPrompt: string
): typeof AgentConfigurationSchema.State => {
  const configurable = config.configurable ?? {};
  return {
    model: configurable.model ?? process.env.BASE_MODEL,
    systemPrompt: configurable.systemPrompt ?? defaultPrompt,
    maxIterations: configurable.maxIterations ?? 3,
  };
};
