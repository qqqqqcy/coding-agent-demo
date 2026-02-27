import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";

const editTool = tool(
  async ({ file_path, old_string, new_string, replace_all }) => {
    try {
      if (!fs.existsSync(file_path)) {
        return `Error: File not found: ${file_path}`;
      }

      const content = fs.readFileSync(file_path, "utf-8");

      if (!content.includes(old_string)) {
        return `Error: old_string not found in file. Make sure the string matches exactly, including whitespace and indentation.`;
      }

      if (old_string === new_string) {
        return `Error: old_string and new_string are identical. No changes made.`;
      }

      let newContent;
      if (replace_all) {
        newContent = content.split(old_string).join(new_string);
      } else {
        // Check uniqueness
        const occurrences = content.split(old_string).length - 1;
        if (occurrences > 1) {
          return `Error: old_string appears ${occurrences} times in the file. Provide more context to make it unique, or use replace_all to replace all occurrences.`;
        }
        newContent = content.replace(old_string, new_string);
      }

      fs.writeFileSync(file_path, newContent, "utf-8");
      return `Successfully edited ${file_path}`;
    } catch (error) {
      return `Error editing file: ${error.message}`;
    }
  },
  {
    name: "edit",
    description:
      "Performs exact string replacements in files. The old_string must match exactly (including whitespace/indentation). The edit will fail if old_string is not unique — provide more context or use replace_all. Always prefer editing over writing entire files.",
    schema: z.object({
      file_path: z
        .string()
        .describe("The absolute path to the file to modify"),
      old_string: z.string().describe("The text to replace"),
      new_string: z
        .string()
        .describe("The text to replace it with (must be different from old_string)"),
      replace_all: z
        .boolean()
        .default(false)
        .describe("Replace all occurrences of old_string (default false)"),
    }),
  }
);

export default editTool;
