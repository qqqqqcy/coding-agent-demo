import "dotenv/config";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent, FilesystemBackend } from "deepagents";

// 项目根目录，用于提示词中告知 Agent 工作目录
const PROJECT_ROOT = process.cwd();

// 简洁的 ReAct 风格系统提示词
const CODING_AGENT_SYSTEM_PROMPT = `---
PROJECT_ROOT: ${PROJECT_ROOT}
---

// As a ReAct coding agent, interpret user instructions and execute them using the most suitable tool.`;

export const codingAgent = createDeepAgent({
    model: new ChatDeepSeek({
        model: "deepseek-chat",
        temperature: 0,
        maxTokens: 4096,
        apiKey: process.env.DEEPSEEK_API_KEY,
    }),
    backend: new FilesystemBackend({
        rootDir: PROJECT_ROOT,
        virtualMode: true
    }),
    systemPrompt: CODING_AGENT_SYSTEM_PROMPT,
    name: "coding_agent",
});

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('请输入指令');
    process.exit(1);
} else {
    codingAgent.invoke({
        // messages: [{ role: "user", content: '概述下 0_deepagents 项目' }],
        messages: [{ role: "user", content: args?.[0] }],
    }).then(res => {
        console.log(res.messages[res.messages.length - 1].content);
    }).catch(err => {
        console.error(err);
    });
}