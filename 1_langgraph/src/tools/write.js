import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";

const writeTool = tool(
  async ({ file_path, content }) => {
    try {
      // Ensure parent directory exists
      const dir = path.dirname(file_path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(file_path, content, "utf-8");
      return `Successfully wrote to ${file_path}`;
    } catch (error) {
      return `Error writing file: ${error.message}`;
    }
  },
  {
    name: "write",
    description:
      "Writes a file to the local filesystem. This will overwrite existing files. Prefer the Edit tool for modifying existing files. Use this tool to create new files or for complete rewrites.",
    schema: z.object({
      file_path: z
        .string()
        .describe("The absolute path to the file to write (must be absolute, not relative)"),
      content: z
        .string()
        .describe("The content to write to the file"),
    }),
  }
);

export default writeTool;
