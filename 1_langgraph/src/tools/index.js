export { default as bashTool } from "./bash.js";
export { default as editTool } from "./edit.js";
export { default as globTool } from "./glob.js";
export { default as grepTool } from "./grep.js";
export { default as readTool } from "./read.js";
export { default as writeTool } from "./write.js";

import bashTool from "./bash.js";
import editTool from "./edit.js";
import globTool from "./glob.js";
import grepTool from "./grep.js";
import readTool from "./read.js";
import writeTool from "./write.js";

const allTools = [bashTool, editTool, globTool, grepTool, readTool, writeTool];

export default allTools;
