import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listLists, createList, getList } from "../client.js";
import { createActionableError } from "../errors.js";

export const listTools: Tool[] = [
  {
    name: "list_lists",
    description: `Get all todo lists with pagination and filtering.

Returns list metadata including title, creation time, and item counts.

Use this when:
- User asks "what lists do I have?" or "show my lists"
- Need to find a list ID before operating on items
- Exploring available lists to choose where to add a task
- Checking if a specific list exists

Supports filtering by title and sorting by creation time or title.`,
    inputSchema: {
      type: "object",
      properties: {
        page_size: {
          type: "number",
          description: "Number of lists per page (1-100, default 25)",
        },
        page_token: {
          type: "string",
          description: "Page token from previous response for pagination",
        },
        title_contains: {
          type: "string",
          description: "Filter by title substring (case-insensitive)",
        },
        created_after: {
          type: "string",
          description: "Filter lists created after this time (ISO 8601 datetime)",
        },
        created_before: {
          type: "string",
          description: "Filter lists created before this time (ISO 8601 datetime)",
        },
        sort_by: {
          type: "string",
          enum: ["create_time", "title"],
          description: "Field to sort by (default: create_time)",
        },
        sort_dir: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default: desc)",
        },
      },
    },
  },
  {
    name: "create_list",
    description: `Create a new todo list with the given title.

Use this when:
- User wants to organize tasks into a new category
- "Create a list for work tasks"
- Need a dedicated space for a project or context

Title must be 1-255 characters.`,
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "List title (1-255 chars, required)",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "get_list",
    description: `Get a specific todo list by ID.

Returns list metadata including total and undone item counts.
Note: This does NOT return the items themselves - use list_items for that.

Use this when:
- Need to verify a list exists before adding items
- Want to check item counts for a specific list
- User asks "how many tasks are in my work list?"`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
      },
      required: ["list_id"],
    },
  },
];

/**
 * Executes list-related MCP tools (list_lists, create_list, get_list).
 *
 * Handles all operations related to todo lists including listing, creation, and retrieval.
 * Converts API errors into actionable errors with recovery guidance.
 *
 * @param name - Name of the list tool to execute
 * @param args - Tool-specific arguments
 * @returns Promise resolving to the API response data
 * @throws ActionableError if the API request fails
 *
 * @example
 * ```typescript
 * const lists = await executeListTool("list_lists", { page_size: 10 });
 * const newList = await executeListTool("create_list", { title: "Work Tasks" });
 * ```
 */
export async function executeListTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_lists": {
      const { data, error, response } = await listLists({
        query: {
          page_size: args.page_size as number | undefined,
          page_token: args.page_token as string | undefined,
          title_contains: args.title_contains as string | undefined,
          created_after: args.created_after as string | undefined,
          created_before: args.created_before as string | undefined,
          sort_by: args.sort_by as "create_time" | "title" | undefined,
          sort_dir: args.sort_dir as "asc" | "desc" | undefined,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "list_lists",
          params: args,
        });
      }

      return data;
    }

    case "create_list": {
      const { data, error, response } = await createList({
        body: {
          title: args.title as string,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "create_list",
          params: args,
        });
      }

      return data;
    }

    case "get_list": {
      const { data, error, response } = await getList({
        path: {
          id: args.list_id as string,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "get_list",
          params: args,
        });
      }

      return data;
    }

    default:
      throw new Error(`Unknown list tool: ${name}`);
  }
}
