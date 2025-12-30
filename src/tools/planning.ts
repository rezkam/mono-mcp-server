import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { monoFetch, buildQueryString } from "../client.js";
import type { ListItemsResponse, ListListsResponse, TodoItem, CreateItemResponse, CreateItemRequest } from "../types.js";

export const planningTools: Tool[] = [
  {
    name: "get_plannable_tasks",
    description: `Get tasks available to work on for daily planning.

Returns tasks with status: todo, in_progress, blocked.
Excludes: done, archived, cancelled.
Sorted by: priority (urgent→high→medium→low), then due_time.

Use this when:
- User asks "what should I work on today?"
- Planning a work session or daily schedule
- Need to see actionable tasks across lists
- Starting daily planning workflow

Returns estimated_duration for time budgeting.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Optional: filter to specific list. If omitted, searches all lists.",
        },
        max_items: {
          type: "number",
          description: "Limit results (default: 50)",
        },
        include_blocked: {
          type: "boolean",
          description: "Include blocked items in results (default: true)",
        },
      },
    },
  },
  {
    name: "get_overdue_tasks",
    description: `Get tasks that are past their due date.

Returns tasks where due_time < now and status is not done/archived/cancelled.
Sorted by: how overdue (oldest first).

Use this when:
- Starting daily planning (address overdue first)
- User asks "what am I behind on?" or "what's overdue?"
- Need to identify urgent catch-up work
- Prioritizing tasks by urgency

Critical for responsible task management.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Optional: filter to specific list",
        },
      },
    },
  },
  {
    name: "get_tasks_due_soon",
    description: `Get tasks due within a time window.

Returns tasks with due_time between now and now + days_ahead.
Excludes done/archived/cancelled.
Sorted by: due_time ascending (soonest first).

Use this when:
- Planning the week ahead
- User asks "what's coming up?" or "what's due this week?"
- Need to see upcoming deadlines
- Proactive planning to avoid last-minute rushes`,
    inputSchema: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description: "Days to look ahead (default: 7 for one week)",
        },
        list_id: {
          type: "string",
          description: "Optional: filter to specific list",
        },
      },
    },
  },
  {
    name: "get_tasks_by_tag",
    description: `Get tasks filtered by tag/context.

Returns plannable tasks (todo, in_progress, blocked) that have the specified tag.
Sorted by: priority, then due_time.

Use this when:
- User wants to focus on a context: "show me work tasks"
- Planning around location: "what can I do at home?"
- Batching similar tasks: "all my errands"
- Context-based time blocking

Combine with estimated durations for context-based planning.`,
    inputSchema: {
      type: "object",
      properties: {
        tag: {
          type: "string",
          description: "Tag to filter by (required)",
        },
        list_id: {
          type: "string",
          description: "Optional: filter to specific list",
        },
      },
      required: ["tag"],
    },
  },
  {
    name: "get_workload_summary",
    description: `Get aggregated view of pending work.

Returns summary of plannable tasks:
- Total count and estimated hours
- Breakdown by priority level (urgent: X tasks, Y hours; high: ...)
- Breakdown by tag
- Overdue count
- Due this week count

Use this when:
- User asks "how much work do I have?"
- Assessing if user can take on new tasks
- Providing overview before detailed planning
- Answering capacity questions

Helps answer capacity questions without listing every task.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Optional: filter to specific list",
        },
      },
    },
  },
  {
    name: "quick_add_task",
    description: `Quickly add a task with smart defaults.

Creates a task with sensible defaults:
- Status: todo
- Priority: medium (unless specified)

Use this when:
- User quickly mentions a task to remember
- "Add buy groceries to my personal list"
- Rapid task capture during conversation
- Don't need to specify all details upfront

For detailed task creation, use create_item instead.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Which list to add to (required)",
        },
        title: {
          type: "string",
          description: "Task title (required)",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority level (optional, defaults to medium)",
        },
        due_time: {
          type: "string",
          description: "ISO 8601 datetime (optional)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Tags (optional)",
        },
        estimated_duration: {
          type: "string",
          description: "ISO 8601 duration like 'PT1H30M' (optional)",
        },
      },
      required: ["list_id", "title"],
    },
  },
];

// Helper to parse ISO 8601 duration to hours
function parseDurationToHours(duration: string | undefined): number {
  if (!duration) return 0;

  // Simple parser for PT format (PT1H30M, PT2H, PT30M)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours + minutes / 60;
}

export async function executePlanningTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_plannable_tasks": {
      const statuses = args.include_blocked === false ? ["todo", "in_progress"] : ["todo", "in_progress", "blocked"];

      if (args.list_id) {
        // Query specific list
        const query = buildQueryString({
          status: statuses,
          sort_by: "priority",
          sort_dir: "desc",
          page_size: args.max_items || 50,
        });
        const response = await monoFetch<ListItemsResponse>(
          `/v1/lists/${args.list_id}/items${query}`,
          {},
          { operation: "get_plannable_tasks", params: args }
        );
        return response;
      } else {
        // Query all lists
        const listsResponse = await monoFetch<ListListsResponse>(
          "/v1/lists",
          {},
          { operation: "get_plannable_tasks", params: args }
        );

        const allItems: TodoItem[] = [];
        for (const list of listsResponse.lists) {
          const query = buildQueryString({
            status: statuses,
            page_size: 100,
          });
          const itemsResponse = await monoFetch<ListItemsResponse>(
            `/v1/lists/${list.id}/items${query}`,
            {},
            { operation: "get_plannable_tasks", params: args }
          );
          allItems.push(...itemsResponse.items);
        }

        // Sort by priority then due_time
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        allItems.sort((a, b) => {
          const aPrio = priorityOrder[a.priority || "medium"];
          const bPrio = priorityOrder[b.priority || "medium"];
          if (aPrio !== bPrio) return aPrio - bPrio;

          if (a.due_time && b.due_time) {
            return new Date(a.due_time).getTime() - new Date(b.due_time).getTime();
          }
          if (a.due_time) return -1;
          if (b.due_time) return 1;
          return 0;
        });

        const maxItems = (args.max_items as number) || 50;
        return { items: allItems.slice(0, maxItems) };
      }
    }

    case "get_overdue_tasks": {
      const now = new Date().toISOString();
      const statuses = ["todo", "in_progress", "blocked"];

      if (args.list_id) {
        const query = buildQueryString({
          status: statuses,
          sort_by: "due_time",
          sort_dir: "asc",
          page_size: 100,
        });
        const response = await monoFetch<ListItemsResponse>(
          `/v1/lists/${args.list_id}/items${query}`,
          {},
          { operation: "get_overdue_tasks", params: args }
        );

        const overdue = response.items.filter((item) => item.due_time && item.due_time < now);
        return { items: overdue };
      } else {
        const listsResponse = await monoFetch<ListListsResponse>(
          "/v1/lists",
          {},
          { operation: "get_overdue_tasks", params: args }
        );

        const allOverdue: TodoItem[] = [];
        for (const list of listsResponse.lists) {
          const query = buildQueryString({
            status: statuses,
            page_size: 100,
          });
          const itemsResponse = await monoFetch<ListItemsResponse>(
            `/v1/lists/${list.id}/items${query}`,
            {},
            { operation: "get_overdue_tasks", params: args }
          );
          const overdue = itemsResponse.items.filter((item) => item.due_time && item.due_time < now);
          allOverdue.push(...overdue);
        }

        allOverdue.sort((a, b) => {
          if (!a.due_time || !b.due_time) return 0;
          return new Date(a.due_time).getTime() - new Date(b.due_time).getTime();
        });

        return { items: allOverdue };
      }
    }

    case "get_tasks_due_soon": {
      const now = new Date();
      const daysAhead = (args.days_ahead as number) || 7;
      const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
      const nowISO = now.toISOString();
      const statuses = ["todo", "in_progress", "blocked"];

      if (args.list_id) {
        const query = buildQueryString({
          status: statuses,
          sort_by: "due_time",
          sort_dir: "asc",
          page_size: 100,
        });
        const response = await monoFetch<ListItemsResponse>(
          `/v1/lists/${args.list_id}/items${query}`,
          {},
          { operation: "get_tasks_due_soon", params: args }
        );

        const dueSoon = response.items.filter((item) => item.due_time && item.due_time >= nowISO && item.due_time <= future);
        return { items: dueSoon };
      } else {
        const listsResponse = await monoFetch<ListListsResponse>(
          "/v1/lists",
          {},
          { operation: "get_tasks_due_soon", params: args }
        );

        const allDueSoon: TodoItem[] = [];
        for (const list of listsResponse.lists) {
          const query = buildQueryString({
            status: statuses,
            page_size: 100,
          });
          const itemsResponse = await monoFetch<ListItemsResponse>(
            `/v1/lists/${list.id}/items${query}`,
            {},
            { operation: "get_tasks_due_soon", params: args }
          );
          const dueSoon = itemsResponse.items.filter((item) => item.due_time && item.due_time >= nowISO && item.due_time <= future);
          allDueSoon.push(...dueSoon);
        }

        allDueSoon.sort((a, b) => {
          if (!a.due_time || !b.due_time) return 0;
          return new Date(a.due_time).getTime() - new Date(b.due_time).getTime();
        });

        return { items: allDueSoon };
      }
    }

    case "get_tasks_by_tag": {
      const statuses = ["todo", "in_progress", "blocked"];

      if (args.list_id) {
        const query = buildQueryString({
          status: statuses,
          tags: [args.tag as string],
          sort_by: "priority",
          sort_dir: "desc",
          page_size: 100,
        });
        return monoFetch<ListItemsResponse>(
          `/v1/lists/${args.list_id}/items${query}`,
          {},
          { operation: "get_tasks_by_tag", params: args }
        );
      } else {
        const listsResponse = await monoFetch<ListListsResponse>(
          "/v1/lists",
          {},
          { operation: "get_tasks_by_tag", params: args }
        );

        const allItems: TodoItem[] = [];
        for (const list of listsResponse.lists) {
          const query = buildQueryString({
            status: statuses,
            tags: [args.tag as string],
            page_size: 100,
          });
          const itemsResponse = await monoFetch<ListItemsResponse>(
            `/v1/lists/${list.id}/items${query}`,
            {},
            { operation: "get_tasks_by_tag", params: args }
          );
          allItems.push(...itemsResponse.items);
        }

        // Sort by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        allItems.sort((a, b) => {
          const aPrio = priorityOrder[a.priority || "medium"];
          const bPrio = priorityOrder[b.priority || "medium"];
          if (aPrio !== bPrio) return aPrio - bPrio;

          if (a.due_time && b.due_time) {
            return new Date(a.due_time).getTime() - new Date(b.due_time).getTime();
          }
          return 0;
        });

        return { items: allItems };
      }
    }

    case "get_workload_summary": {
      const statuses = ["todo", "in_progress", "blocked"];
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const nowISO = now.toISOString();

      let allItems: TodoItem[] = [];

      if (args.list_id) {
        const query = buildQueryString({
          status: statuses,
          page_size: 100,
        });
        const response = await monoFetch<ListItemsResponse>(
          `/v1/lists/${args.list_id}/items${query}`,
          {},
          { operation: "get_workload_summary", params: args }
        );
        allItems = response.items;
      } else {
        const listsResponse = await monoFetch<ListListsResponse>(
          "/v1/lists",
          {},
          { operation: "get_workload_summary", params: args }
        );

        for (const list of listsResponse.lists) {
          const query = buildQueryString({
            status: statuses,
            page_size: 100,
          });
          const itemsResponse = await monoFetch<ListItemsResponse>(
            `/v1/lists/${list.id}/items${query}`,
            {},
            { operation: "get_workload_summary", params: args }
          );
          allItems.push(...itemsResponse.items);
        }
      }

      // Calculate summary
      const byPriority: Record<string, { count: number; hours: number }> = {
        urgent: { count: 0, hours: 0 },
        high: { count: 0, hours: 0 },
        medium: { count: 0, hours: 0 },
        low: { count: 0, hours: 0 },
      };

      const byTag: Record<string, { count: number; hours: number }> = {};
      let totalHours = 0;
      let overdueCount = 0;
      let dueThisWeekCount = 0;

      for (const item of allItems) {
        const priority = item.priority || "medium";
        const hours = parseDurationToHours(item.estimated_duration);

        byPriority[priority].count++;
        byPriority[priority].hours += hours;
        totalHours += hours;

        if (item.due_time && item.due_time < nowISO) {
          overdueCount++;
        }

        if (item.due_time && item.due_time >= nowISO && item.due_time <= oneWeekFromNow) {
          dueThisWeekCount++;
        }

        for (const tag of item.tags) {
          if (!byTag[tag]) {
            byTag[tag] = { count: 0, hours: 0 };
          }
          byTag[tag].count++;
          byTag[tag].hours += hours;
        }
      }

      return {
        total_tasks: allItems.length,
        total_hours: Math.round(totalHours * 10) / 10,
        overdue_count: overdueCount,
        due_this_week_count: dueThisWeekCount,
        by_priority: byPriority,
        by_tag: byTag,
      };
    }

    case "quick_add_task": {
      const taskData: CreateItemRequest = {
        title: args.title as string,
        priority: (args.priority as "low" | "medium" | "high" | "urgent") || "medium",
        due_time: args.due_time as string | undefined,
        tags: args.tags as string[] | undefined,
        estimated_duration: args.estimated_duration as string | undefined,
      };

      return monoFetch<CreateItemResponse>(
        `/v1/lists/${args.list_id}/items`,
        {
          method: "POST",
          body: JSON.stringify(taskData),
        },
        { operation: "quick_add_task", params: args }
      );
    }

    default:
      throw new Error(`Unknown planning tool: ${name}`);
  }
}
