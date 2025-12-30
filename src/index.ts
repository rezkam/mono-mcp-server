#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { allTools, executeTool } from "./tools/index.js";
import type { ActionableError } from "./types.js";
import packageJson from "../package.json" with { type: "json" };

// Validate configuration
const MONO_API_KEY = process.env.MONO_API_KEY;
const MONO_API_BASE = process.env.MONO_API_URL || "https://monodo.app/api";

if (!MONO_API_KEY) {
  console.error("Error: MONO_API_KEY environment variable is required");
  console.error("Please set your Mono API key in the MCP client configuration.");
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: "mono-mcp-server",
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeTool(name, args || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle actionable errors from our error handling system
    if (error && typeof error === "object" && "code" in error) {
      const actionableError = error as ActionableError;
      const errorMessage = [
        `Error: ${actionableError.error}`,
        `Code: ${actionableError.code}`,
        actionableError.field ? `Field: ${actionableError.field}` : "",
        `\nSuggestion: ${actionableError.suggestion}`,
        actionableError.recovery_action ? `Recovery: ${actionableError.recovery_action}` : "",
        actionableError.valid_values ? `\nValid values: ${actionableError.valid_values.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [{ type: "text", text: errorMessage }],
        isError: true,
      };
    }

    // Handle unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Unexpected error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Mono MCP server running`);
  console.error(`API Base: ${MONO_API_BASE}`);
  console.error(`Tools available: ${allTools.length}`);
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
