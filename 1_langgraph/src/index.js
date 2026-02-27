import "dotenv/config";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import allTools from "./tools/index.js";

// 项目根目录
const PROJECT_ROOT = process.cwd();

// ReAct Coding Agent 系统提示词
const SYSTEM_PROMPT = `---
PROJECT_ROOT: ${PROJECT_ROOT}
---

You are a ReAct-style coding agent. You have access to a set of tools for interacting with the filesystem and executing commands.

When given a task:
1. Think about what you need to do
2. Use the appropriate tool to gather information or make changes
3. Observe the result
4. Repeat until the task is complete
`;

// 构建 toolsByName 映射
const toolsByName = {};
for (const t of allTools) {
  toolsByName[t.name] = t;
}

// 将工具绑定到模型
const model = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0,
  maxTokens: 4096,
  apiKey: process.env.DEEPSEEK_API_KEY,
});
const modelWithTools = model.bindTools(allTools);

// Step 1: 模型节点 — 调用 LLM 决定是否使用工具
const llmCall = async (state) => {
  const response = await modelWithTools.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages,
  ]);
  return { messages: [response] };
};

// Step 2: 工具节点 — 执行 LLM 请求的工具调用
const toolNode = async (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const results = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      results.push({
        role: "tool",
        content: `Error: Unknown tool "${toolCall.name}"`,
        tool_call_id: toolCall.id,
      });
      continue;
    }
    const observation = await tool.invoke(toolCall);
    results.push(observation);
  }

  return { messages: results };
};

// Step 3: 条件路由 — 有 tool_calls 则继续，否则结束
const shouldContinue = (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  return END;
};

// Step 4: 构建并编译 StateGraph
const agent = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

// CLI 入口
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("请输入指令");
  process.exit(1);
}

const result = await agent.invoke(
  { messages: [new HumanMessage(args[0])] },
  { recursionLimit: 100 },
);

// 输出最后一条消息
const lastMsg = result.messages[result.messages.length - 1];
console.log(lastMsg.content);
