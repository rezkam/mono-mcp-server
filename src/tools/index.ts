import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listTools, executeListTool } from "./lists.js";
import { itemTools, executeItemTool } from "./items.js";
import { recurringTools, executeRecurringTool } from "./recurring.js";
import { planningTools, executePlanningTool } from "./planning.js";

// Export all tools combined
export const allTools: Tool[] = [
  ...planningTools, // Planning tools first - most relevant for LLM
  ...listTools,
  ...itemTools,
  ...recurringTools,
];

// Execute tool by name
export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  // Check planning tools
  if (planningTools.find((t) => t.name === name)) {
    return executePlanningTool(name, args);
  }

  // Check list tools
  if (listTools.find((t) => t.name === name)) {
    return executeListTool(name, args);
  }

  // Check item tools
  if (itemTools.find((t) => t.name === name)) {
    return executeItemTool(name, args);
  }

  // Check recurring tools
  if (recurringTools.find((t) => t.name === name)) {
    return executeRecurringTool(name, args);
  }

  throw new Error(`Unknown tool: ${name}`);
}
