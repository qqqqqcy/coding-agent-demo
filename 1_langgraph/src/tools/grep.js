import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execSync } from "child_process";

const grepTool = tool(
  async ({
    pattern,
    path,
    glob: globPattern,
    output_mode,
    type,
    multiline,
    ...flags
  }) => {
    try {
      const args = [];

      // Output mode
      if (output_mode === "files_with_matches" || !output_mode) {
        args.push("-l");
      } else if (output_mode === "count") {
        args.push("-c");
      }

      // Line numbers (default true for content mode)
      if (output_mode === "content" && flags["-n"] !== false) {
        args.push("-n");
      }

      // Case insensitive
      if (flags["-i"]) {
        args.push("-i");
      }

      // Context lines
      if (output_mode === "content") {
        if (flags["-C"] != null) args.push("-C", String(flags["-C"]));
        if (flags["-B"] != null) args.push("-B", String(flags["-B"]));
        if (flags["-A"] != null) args.push("-A", String(flags["-A"]));
      }

      // Multiline
      if (multiline) {
        args.push("-U", "--multiline-dotall");
      }

      // File type filter
      if (type) {
        args.push("--type", type);
      }

      // Glob filter
      if (globPattern) {
        args.push("--glob", globPattern);
      }

      // Pattern
      args.push("-e", pattern);

      // Path
      args.push(path || ".");

      const command = `rg ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`;

      const result = execSync(command, {
        cwd: process.cwd(),
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      });

      let output = result.trim();

      // Apply head_limit
      if (flags.head_limit && flags.head_limit > 0) {
        const lines = output.split("\n");
        const offset = flags.offset || 0;
        output = lines.slice(offset, offset + flags.head_limit).join("\n");
      } else if (flags.offset && flags.offset > 0) {
        const lines = output.split("\n");
        output = lines.slice(flags.offset).join("\n");
      }

      return output || "No matches found.";
    } catch (error) {
      if (error.status === 1) {
        return "No matches found.";
      }
      return `Error during grep: ${error.message}`;
    }
  },
  {
    name: "grep",
    description:
      'A powerful search tool built on ripgrep. Supports full regex syntax, file type filtering, glob patterns, and multiple output modes. Use output_mode "content" for matching lines, "files_with_matches" for file paths, "count" for match counts.',
    schema: z.object({
      pattern: z
        .string()
        .describe("The regular expression pattern to search for in file contents"),
      path: z
        .string()
        .optional()
        .describe("File or directory to search in. Defaults to current working directory."),
      glob: z
        .string()
        .optional()
        .describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}")'),
      output_mode: z
        .enum(["content", "files_with_matches", "count"])
        .optional()
        .default("files_with_matches")
        .describe('Output mode. Defaults to "files_with_matches".'),
      "-B": z
        .number()
        .optional()
        .describe("Number of lines to show before each match"),
      "-A": z
        .number()
        .optional()
        .describe("Number of lines to show after each match"),
      "-C": z
        .number()
        .optional()
        .describe("Number of lines to show before and after each match"),
      "-n": z
        .boolean()
        .optional()
        .default(true)
        .describe("Show line numbers in output. Defaults to true."),
      "-i": z
        .boolean()
        .optional()
        .describe("Case insensitive search"),
      type: z
        .string()
        .optional()
        .describe("File type to search (e.g. js, py, rust, go)"),
      head_limit: z
        .number()
        .optional()
        .describe("Limit output to first N lines/entries"),
      offset: z
        .number()
        .optional()
        .describe("Skip first N lines/entries before applying head_limit"),
      multiline: z
        .boolean()
        .optional()
        .default(false)
        .describe("Enable multiline mode where patterns can span lines. Default: false."),
    }),
  }
);

export default grepTool;
