import "dotenv/config";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createAgent, todoListMiddleware } from "langchain";
import allTools from "../../1_langgraph/src/tools/index.js";
import { taskTool } from "./tools/task.js";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import mcpConfig from "../mcp.json" assert { type: "json" };
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const PROJECT_ROOT = process.cwd();

const systemPrompt = fs.readFileSync(path.join(__dirname, './md/system_prompt.md'), "utf8");

// ReAct Coding Agent 系统提示词
const SYSTEM_PROMPT = `---
PROJECT_ROOT: ${PROJECT_ROOT}
---
${systemPrompt}
`;

// 创建模型
const model = new ChatDeepSeek({
    model: "deepseek-chat",
    temperature: 0,
    // maxTokens: 4096,
    apiKey: process.env.DEEPSEEK_API_KEY,
});

const loadCustomMcp = async () => {
    if (Object.keys(mcpConfig.mcpServers).length === 0) {
        return [];
    }
    const client = new MultiServerMCPClient(mcpConfig.mcpServers);
    const tools = await client.getTools();
    return tools;
};

const tools = [...allTools, taskTool, ...(await loadCustomMcp())];

const agent = createAgent({
    model,
    tools,
    systemPrompt: SYSTEM_PROMPT,
    middleware: [todoListMiddleware()],
});

// CLI 入口
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("请输入指令");
    process.exit(1);
}


const result = await agent.invoke(
    {
        messages: [
            {
                role: "user",
                content: args[0],
            },
        ],
    },
    { recursionLimit: 100 },
);

// 输出最后一条消息
const lastMsg = result.messages[result.messages.length - 1];
console.log(lastMsg.content);
