import "dotenv/config";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createAgent, todoListMiddleware } from "langchain";
import allTools from "../../../1_langgraph/src/tools/index.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 项目根目录
const PROJECT_ROOT = process.cwd();

// ReAct Coding Agent 系统提示词
const SYSTEM_PROMPT = `---
PROJECT_ROOT: ${PROJECT_ROOT}
---

When given a task:
1. Think about what you need to do
2. Use the appropriate tool to gather information or make changes
3. Observe the result
4. Repeat until the task is complete
`;


// 创建模型
const model = new ChatDeepSeek({
    model: "deepseek-chat",
    temperature: 0,
    maxTokens: 4096,
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export const taskTool = tool(
    async ({ input, systemPrompt }) => {
        const agent = createAgent({
            model,
            tools: allTools,
            systemPrompt: SYSTEM_PROMPT + "\n" + systemPrompt,
            middleware: [todoListMiddleware()],
        });
        const result = await agent.invoke(
            {
                messages: [
                    {
                        role: "user",
                        content: input,
                    },
                ],
            },
            { recursionLimit: 100 },
        );

        const lastMsg = result.messages[result.messages.length - 1];
        if (typeof lastMsg.content === "string") {
            return lastMsg.content;
        }
        return JSON.stringify(lastMsg.content, null, 2);
    },
    {
        name: "task",
        description:
            "Launches a new agent to handle complex, multi-step coding tasks autonomously. The input must include the task goal, all currently known relevant file paths and/or code snippets, any prior analysis results or summaries, plus key constraints (tech stack, style, do/don't rules, performance or security requirements) so the sub agent can work in a single shot with full context.",
        schema: z.object({
            input: z
                .string()
                .describe(
                    "Task description with full context for the sub agent. Include: (1) the user's goal and what needs to be done, (2) relevant file paths, modules, and/or code snippets, (3) any prior analysis results, summaries, or discovered facts that could help, and (4) important constraints such as tech stack, coding style, do/don't rules, and performance/security requirements.",
                ),
            systemPrompt: z
                .string()
                .describe(
                    "The system prompt to be used for the sub agent. This should include all relevant context for the sub agent to work with.",
                ),
        }),
    },
);