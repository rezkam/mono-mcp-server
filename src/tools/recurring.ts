import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  listRecurringTemplates,
  createRecurringTemplate,
  getRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
} from "../client.js";
import { createActionableError } from "../errors.js";
import { extractUpdateFields } from "../utils/update-mask.js";

export const recurringTools: Tool[] = [
  {
    name: "list_recurring_templates",
    description: `Get recurring item templates for a list.

Templates define tasks that auto-generate on a schedule (daily standup, weekly reports, etc).

Use this when:
- User asks "what recurring tasks do I have?"
- Need to see or manage automated task generation
- Checking if a recurring task exists before creating it`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        active_only: {
          type: "boolean",
          description: "Filter for active templates only (default: false shows all)",
        },
      },
      required: ["list_id"],
    },
  },
  {
    name: "create_recurring_template",
    description: `Create a recurring task template.

Templates automatically generate task instances based on a schedule.
Examples: daily standup, weekly review, monthly reports.

Use this when:
- User wants regular reminders: "remind me to check email every weekday"
- Setting up routine tasks: "weekly team meeting every Monday"
- Automating repetitive tasks

Patterns: daily, weekly, biweekly, monthly, yearly, quarterly, weekdays`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        title: {
          type: "string",
          description: "Template title (will be used for generated tasks, required)",
        },
        recurrence_pattern: {
          type: "string",
          enum: ["daily", "weekly", "biweekly", "monthly", "yearly", "quarterly", "weekdays"],
          description: "How often to generate tasks (required)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Tags to apply to generated tasks",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority for generated tasks",
        },
        estimated_duration: {
          type: "string",
          description: "ISO 8601 duration for generated tasks (e.g., 'PT30M')",
        },
        due_offset: {
          type: "string",
          description: "ISO 8601 duration offset from instance date (e.g., 'PT9H' for 9am)",
        },
        generation_window_days: {
          type: "number",
          description: "How far ahead to generate instances (1-365, default: 30)",
        },
      },
      required: ["list_id", "title", "recurrence_pattern"],
    },
  },
  {
    name: "update_recurring_template",
    description: `Update a recurring template.

Changes affect future generated tasks, not existing ones.

Use this when:
- User wants to change recurring schedule
- Updating template details (title, priority, tags)
- Pausing template by setting is_active to false`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        template_id: {
          type: "string",
          description: "UUID of the template to update (required)",
        },
        update_mask: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "title",
              "tags",
              "priority",
              "estimated_duration",
              "recurrence_pattern",
              "recurrence_config",
              "due_offset",
              "is_active",
              "generation_window_days",
            ],
          },
          description: "Fields to update (required, must not be empty)",
        },
        title: {
          type: "string",
          description: "New title (if updating title)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "New tags (if updating tags)",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "New priority (if updating priority)",
        },
        estimated_duration: {
          type: "string",
          description: "New estimated duration (if updating estimated_duration)",
        },
        recurrence_pattern: {
          type: "string",
          enum: ["daily", "weekly", "biweekly", "monthly", "yearly", "quarterly", "weekdays"],
          description: "New recurrence pattern (if updating recurrence_pattern)",
        },
        is_active: {
          type: "boolean",
          description: "Set to false to pause generation (if updating is_active)",
        },
        generation_window_days: {
          type: "number",
          description: "New generation window (if updating generation_window_days)",
        },
      },
      required: ["list_id", "template_id", "update_mask"],
    },
  },
  {
    name: "delete_recurring_template",
    description: `Delete a recurring template.

Stops future task generation. Does NOT delete already-generated tasks.

Use this when:
- User no longer needs the recurring task
- Replacing template with a different schedule
- Cleaning up unused templates`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        template_id: {
          type: "string",
          description: "UUID of the template to delete (required)",
        },
      },
      required: ["list_id", "template_id"],
    },
  },
];

/**
 * Executes recurring template-related MCP tools.
 *
 * Handles operations for managing recurring task templates including listing,
 * creation, retrieval, updates, and deletion. Templates automatically generate
 * task instances based on a schedule (daily, weekly, monthly, etc.).
 *
 * @param name - Name of the recurring tool to execute
 * @param args - Tool-specific arguments
 * @returns Promise resolving to the API response data
 * @throws ActionableError if the API request fails
 *
 * @example
 * ```typescript
 * const templates = await executeRecurringTool("list_recurring_templates", { list_id: "123" });
 * const template = await executeRecurringTool("create_recurring_template", {
 *   list_id: "123",
 *   title: "Daily Standup",
 *   recurrence_pattern: "weekdays"
 * });
 * ```
 */
export async function executeRecurringTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_recurring_templates": {
      const { data, error, response } = await listRecurringTemplates({
        path: { list_id: args.list_id as string },
        query: {
          active_only: args.active_only as boolean | undefined,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "list_recurring_templates",
          params: args,
        });
      }

      return data;
    }

    case "create_recurring_template": {
      const { list_id, ...templateData } = args;
      const { data, error, response } = await createRecurringTemplate({
        path: { list_id: list_id as string },
        body: templateData as any,
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "create_recurring_template",
          params: args,
        });
      }

      return data;
    }

    case "get_recurring_template": {
      const { data, error, response } = await getRecurringTemplate({
        path: {
          list_id: args.list_id as string,
          template_id: args.template_id as string,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "get_recurring_template",
          params: args,
        });
      }

      return data;
    }

    case "update_recurring_template": {
      const { list_id, template_id, update_mask, ...fields } = args;
      const template = extractUpdateFields(fields, update_mask as string[]);

      const { data, error, response } = await updateRecurringTemplate({
        path: {
          list_id: list_id as string,
          template_id: template_id as string,
        },
        body: {
          update_mask: update_mask as any,
          template,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "update_recurring_template",
          params: args,
        });
      }

      return data;
    }

    case "delete_recurring_template": {
      const { data, error, response } = await deleteRecurringTemplate({
        path: {
          list_id: args.list_id as string,
          template_id: args.template_id as string,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "delete_recurring_template",
          params: args,
        });
      }

      return data;
    }

    default:
      throw new Error(`Unknown recurring tool: ${name}`);
  }
}
