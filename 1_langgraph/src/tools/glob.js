import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { glob as globFn } from "glob";
import fs from "fs";

const globTool = tool(
  async ({ pattern, path }) => {
    try {
      const cwd = path || process.cwd();

      const files = await globFn(pattern, {
        cwd,
        nodir: true,
        absolute: true,
        dot: false,
      });

      if (files.length === 0) {
        return "No files matched the pattern.";
      }

      // Sort by modification time (most recent first)
      const filesWithStats = files.map((f) => {
        try {
          const stat = fs.statSync(f);
          return { path: f, mtime: stat.mtimeMs };
        } catch {
          return { path: f, mtime: 0 };
        }
      });

      filesWithStats.sort((a, b) => b.mtime - a.mtime);

      return filesWithStats.map((f) => f.path).join("\n");
    } catch (error) {
      return `Error during glob: ${error.message}`;
    }
  },
  {
    name: "glob",
    description:
      'Fast file pattern matching tool that works with any codebase size. Supports glob patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time.',
    schema: z.object({
      pattern: z
        .string()
        .describe("The glob pattern to match files against"),
      path: z
        .string()
        .optional()
        .describe(
          "The directory to search in. Defaults to current working directory."
        ),
    }),
  }
);

export default globTool;
