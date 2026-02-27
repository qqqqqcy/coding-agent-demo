import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execSync, spawn } from "child_process";

let currentCwd = process.cwd();

const bashTool = tool(
  async ({ command, timeout, description }) => {
    try {
      const result = execSync(command, {
        cwd: currentCwd,
        timeout: timeout || 120000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: "utf-8",
        shell: process.env.SHELL || "/bin/bash",
        env: { ...process.env },
      });

      // Track cwd changes if the command contains cd
      if (command.includes("cd ")) {
        try {
          const newCwd = execSync("pwd", {
            cwd: currentCwd,
            encoding: "utf-8",
            shell: process.env.SHELL || "/bin/bash",
          }).trim();
          currentCwd = newCwd;
        } catch {}
      }

      return result || "(no output)";
    } catch (error) {
      const stderr = error.stderr || "";
      const stdout = error.stdout || "";
      return `Command failed with exit code ${error.status}\nstdout: ${stdout}\nstderr: ${stderr}`;
    }
  },
  {
    name: "bash",
    description:
      "Executes a given bash command and returns its output. The working directory persists between commands. Use this for running shell commands, git operations, npm scripts, etc. Avoid using it for file operations (read, write, edit, search) — use dedicated tools instead.",
    schema: z.object({
      command: z.string().describe("The command to execute"),
      timeout: z
        .number()
        .max(600000)
        .optional()
        .describe("Optional timeout in milliseconds (max 600000)"),
      description: z
        .string()
        .optional()
        .describe("Clear, concise description of what this command does"),
    }),
  }
);

export default bashTool;
