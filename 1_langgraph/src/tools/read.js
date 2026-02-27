import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";

const readTool = tool(
  async ({ file_path, offset, limit }) => {
    try {
      if (!fs.existsSync(file_path)) {
        return `Error: File not found: ${file_path}`;
      }

      const stat = fs.statSync(file_path);
      if (stat.isDirectory()) {
        return `Error: ${file_path} is a directory, not a file. Use bash 'ls' to list directory contents.`;
      }

      const content = fs.readFileSync(file_path, "utf-8");
      const lines = content.split("\n");

      const startLine = offset ? offset - 1 : 0; // offset is 1-based line number
      const endLine = limit ? startLine + limit : lines.length;

      const selectedLines = lines.slice(startLine, endLine);

      // Format with line numbers (cat -n style)
      const formatted = selectedLines
        .map((line, i) => {
          const lineNum = startLine + i + 1;
          // Truncate lines longer than 2000 characters
          const truncatedLine =
            line.length > 2000 ? line.substring(0, 2000) + "..." : line;
          return `${String(lineNum).padStart(6, " ")}\t${truncatedLine}`;
        })
        .join("\n");

      return formatted || "(empty file)";
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
  {
    name: "read",
    description:
      "Reads a file from the local filesystem. Returns content with line numbers in cat -n format. By default reads up to 2000 lines. Lines longer than 2000 characters are truncated. Use offset and limit for large files.",
    schema: z.object({
      file_path: z
        .string()
        .describe("The absolute path to the file to read"),
      offset: z
        .number()
        .optional()
        .describe("The line number to start reading from (1-based). Only provide for large files."),
      limit: z
        .number()
        .optional()
        .default(2000)
        .describe("The number of lines to read. Defaults to 2000."),
    }),
  }
);

export default readTool;
