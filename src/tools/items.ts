import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listItems, createItem, updateItem } from "../client.js";
import { createActionableError } from "../errors.js";

export const itemTools: Tool[] = [
  {
    name: "list_items",
    description: `Get items in a list with filtering, sorting, and pagination.

By default, excludes archived and cancelled items.
Use status filters to explicitly include them.

Use this when:
- User asks "what tasks do I have?"
- Need to see items before updating one
- Filtering by status (show only todo items)
- Filtering by priority (show high priority tasks)
- Filtering by tags (show all "work" tasks)

Returns items with estimated durations for time budgeting.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        status: {
          type: "array",
          items: {
            type: "string",
            enum: ["todo", "in_progress", "blocked", "done", "archived", "cancelled"],
          },
          description: "Filter by status (multiple allowed for OR logic)",
        },
        priority: {
          type: "array",
          items: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          description: "Filter by priority (multiple allowed for OR logic)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Filter by tags (items must have ALL specified tags)",
        },
        sort_by: {
          type: "string",
          enum: ["due_time", "priority", "created_at", "updated_at"],
          description: "Field to sort by (default: created_at)",
        },
        sort_dir: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default: desc)",
        },
        page_size: {
          type: "number",
          description: "Number of items per page (1-100, default 25)",
        },
        page_token: {
          type: "string",
          description: "Page token from previous response",
        },
      },
      required: ["list_id"],
    },
  },
  {
    name: "create_item",
    description: `Create a new todo item in a list.

Use this when:
- User wants to add a task: "add buy milk to my shopping list"
- Creating a task with details (due date, priority, tags)
- Need precise control over all item fields

For quick task capture with defaults, consider using quick_add_task instead.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list where item will be created (required)",
        },
        title: {
          type: "string",
          description: "Item title (1-255 chars, required)",
        },
        due_time: {
          type: "string",
          description: "Due date/time in ISO 8601 format (e.g., '2025-12-31T23:59:59Z')",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Tags for categorization (e.g., ['work', 'urgent'])",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority level (default: medium implied by UI)",
        },
        estimated_duration: {
          type: "string",
          description: "ISO 8601 duration (e.g., 'PT30M' for 30 min, 'PT2H30M' for 2.5 hours)",
        },
        timezone: {
          type: "string",
          description: "IANA timezone (e.g., 'America/New_York', 'Europe/Stockholm')",
        },
      },
      required: ["list_id", "title"],
    },
  },
  {
    name: "update_item",
    description: `Update an existing item's fields.

Specify which fields to update via update_mask.
Only the fields listed in update_mask will be changed.

Use this when:
- Changing task details (status, priority, due date)
- User asks "mark task as blocked" or "change priority to high"
- Updating multiple fields at once
- Need precise control over what changes

For simply marking a task done, use complete_item instead.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        item_id: {
          type: "string",
          description: "UUID of the item to update (required)",
        },
        update_mask: {
          type: "array",
          items: {
            type: "string",
            enum: ["title", "status", "priority", "due_time", "tags", "estimated_duration", "actual_duration", "timezone"],
          },
          description: "Fields to update (required, must not be empty)",
        },
        title: {
          type: "string",
          description: "New title (if updating title)",
        },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "blocked", "done", "archived", "cancelled"],
          description: "New status (if updating status)",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "New priority (if updating priority)",
        },
        due_time: {
          type: "string",
          description: "New due time in ISO 8601 format (if updating due_time)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "New tags array (if updating tags)",
        },
        estimated_duration: {
          type: "string",
          description: "New estimated duration in ISO 8601 format (if updating estimated_duration)",
        },
        actual_duration: {
          type: "string",
          description: "Actual time spent in ISO 8601 format (if updating actual_duration)",
        },
        timezone: {
          type: "string",
          description: "New timezone (if updating timezone)",
        },
      },
      required: ["list_id", "item_id", "update_mask"],
    },
  },
  {
    name: "complete_item",
    description: `Mark an item as done.

Convenience wrapper for update_item that sets status to "done".

Use this when:
- User says "mark task as complete" or "finish the report task"
- Simpler than using update_item for this common operation
- Don't need to change other fields

Returns the updated item with new status.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        item_id: {
          type: "string",
          description: "UUID of the item to complete (required)",
        },
      },
      required: ["list_id", "item_id"],
    },
  },
];

/**
 * Executes item-related MCP tools (list_items, create_item, update_item, complete_item).
 *
 * Handles all operations related to todo items including listing, creation, updates, and completion.
 * Converts API errors into actionable errors with recovery guidance.
 *
 * @param name - Name of the item tool to execute
 * @param args - Tool-specific arguments
 * @returns Promise resolving to the API response data
 * @throws ActionableError if the API request fails
 *
 * @example
 * ```typescript
 * const items = await executeItemTool("list_items", { list_id: "123", status: ["todo"] });
 * const newItem = await executeItemTool("create_item", { list_id: "123", title: "Buy milk" });
 * await executeItemTool("complete_item", { list_id: "123", item_id: "456" });
 * ```
 */
export async function executeItemTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_items": {
      const { data, error, response } = await listItems({
        path: { list_id: args.list_id as string },
        query: {
          status: args.status as any,
          priority: args.priority as any,
          tags: args.tags as string[] | undefined,
          sort_by: args.sort_by as any,
          sort_dir: args.sort_dir as "asc" | "desc" | undefined,
          page_size: args.page_size as number | undefined,
          page_token: args.page_token as string | undefined,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "list_items",
          params: args,
        });
      }

      return data;
    }

    case "create_item": {
      const { list_id, ...itemData } = args;
      const { data, error, response } = await createItem({
        path: { list_id: list_id as string },
        body: itemData as any,
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "create_item",
          params: args,
        });
      }

      return data;
    }

    case "update_item": {
      const { list_id, item_id, update_mask, ...fields } = args;
      const item: Record<string, unknown> = {};
      for (const field of update_mask as string[]) {
        if (fields[field] !== undefined) {
          item[field] = fields[field];
        }
      }

      const { data, error, response } = await updateItem({
        path: {
          list_id: list_id as string,
          item_id: item_id as string,
        },
        body: {
          update_mask: update_mask as any,
          item,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "update_item",
          params: args,
        });
      }

      return data;
    }

    case "complete_item": {
      const { data, error, response } = await updateItem({
        path: {
          list_id: args.list_id as string,
          item_id: args.item_id as string,
        },
        body: {
          update_mask: ["status"],
          item: { status: "done" },
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "complete_item",
          params: args,
        });
      }

      return data;
    }

    default:
      throw new Error(`Unknown item tool: ${name}`);
  }
}
