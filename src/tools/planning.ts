import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listItems, listLists, createItem, type TodoItem } from "../client.js";
import { createActionableError } from "../errors.js";

export const planningTools: Tool[] = [
  {
    name: "get_plannable_tasks",
    description: `Get tasks that can be worked on now (todo, in_progress, optionally blocked).

Filters out done/archived/cancelled tasks and sorts by priority then due date.
Can query a specific list or aggregate across all lists.

Use this when:
- User asks "what should I work on?"
- "show me my tasks"
- Planning daily work
- Need to prioritize tasks

Returns tasks sorted by priority (urgent > high > medium > low) then by due date.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Limit to specific list (optional, omit to search all lists)",
        },
        include_blocked: {
          type: "boolean",
          description: "Include blocked tasks (default: true)",
        },
        max_items: {
          type: "number",
          description: "Maximum number of tasks to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_overdue_tasks",
    description: `Get tasks that are past their due date and not yet completed.

Shows tasks where due_time < now and status is todo/in_progress/blocked.
Sorted by due date (oldest overdue first).

Use this when:
- User asks "what's overdue?"
- Need to see urgent catch-up work
- Daily review of missed deadlines

Returns overdue tasks sorted by due date.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Limit to specific list (optional)",
        },
      },
    },
  },
  {
    name: "get_tasks_due_soon",
    description: `Get tasks due within the next N days.

Shows upcoming tasks that need attention soon.
Sorted by due date (soonest first).

Use this when:
- User asks "what's due this week?"
- "show me tasks due in the next 3 days"
- Planning upcoming work

Returns tasks due soon sorted by due date.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Limit to specific list (optional)",
        },
        days_ahead: {
          type: "number",
          description: "Number of days to look ahead (default: 7)",
        },
      },
    },
  },
  {
    name: "get_tasks_by_tag",
    description: `Get all tasks with a specific tag.

Useful for viewing tasks by project, context, or category.
Sorted by priority then due date.

Use this when:
- User asks "show me all 'work' tasks"
- Need to see tasks for a specific project
- Filtering by context (home, office, errands)

Returns tagged tasks sorted by priority.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Limit to specific list (optional)",
        },
        tag: {
          type: "string",
          description: "Tag to filter by (required)",
        },
      },
      required: ["tag"],
    },
  },
  {
    name: "get_workload_summary",
    description: `Get a summary of current workload with task counts and estimated hours.

Aggregates tasks by priority and tag, showing:
- Total task count
- Estimated hours of work
- Overdue count
- Due this week count
- Breakdown by priority
- Breakdown by tag

Use this when:
- User asks "how much work do I have?"
- Need capacity planning insight
- Want to see workload distribution
- Time budget analysis

Returns aggregated statistics about the current workload.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "Limit to specific list (optional)",
        },
      },
    },
  },
  {
    name: "quick_add_task",
    description: `Quickly add a task with common fields pre-filled.

Convenience wrapper for create_item with sensible defaults:
- Priority defaults to medium
- No scheduling fields required

Use this when:
- User wants to quickly capture a task
- "add a task to buy milk"
- Simple task creation without ceremony

Returns the created task.`,
    inputSchema: {
      type: "object",
      properties: {
        list_id: {
          type: "string",
          description: "UUID of the list (required)",
        },
        title: {
          type: "string",
          description: "Task title (required)",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority (default: medium)",
        },
        due_time: {
          type: "string",
          description: "Optional due date/time (ISO 8601)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Optional tags",
        },
        estimated_duration: {
          type: "string",
          description: "Optional estimated duration (ISO 8601 duration)",
        },
      },
      required: ["list_id", "title"],
    },
  },
];

function parseDurationToHours(duration?: string): number {
  if (!duration) return 0;
  // Parse ISO 8601 duration (e.g., PT2H30M = 2.5 hours)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  return hours + minutes / 60;
}

/**
 * Executes planning and productivity MCP tools.
 *
 * Provides high-level task management operations including getting plannable tasks,
 * finding overdue items, viewing upcoming due dates, filtering by tags, analyzing
 * workload, and quick task creation.
 *
 * These tools aggregate and filter tasks to help with daily planning and workload management.
 *
 * @param name - Name of the planning tool to execute
 * @param args - Tool-specific arguments
 * @returns Promise resolving to the tool execution result
 * @throws ActionableError if the API request fails
 *
 * @example
 * ```typescript
 * const tasks = await executePlanningTool("get_plannable_tasks", { max_items: 10 });
 * const overdue = await executePlanningTool("get_overdue_tasks", {});
 * const summary = await executePlanningTool("get_workload_summary", { list_id: "123" });
 * ```
 */
export async function executePlanningTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_plannable_tasks": {
      const statuses = args.include_blocked === false ? ["todo", "in_progress"] : ["todo", "in_progress", "blocked"];

      if (args.list_id) {
        // Query specific list
        const { data, error, response } = await listItems({
          path: { list_id: args.list_id as string },
          query: {
            status: statuses as any,
            sort_by: "priority",
            sort_dir: "desc",
            page_size: (args.max_items as number) || 50,
          },
        });

        if (error) {
          throw createActionableError(response.status, error as any, {
            operation: "get_plannable_tasks",
            params: args,
          });
        }

        return data;
      } else {
        // Query all lists
        const { data: listsData, error: listsError, response: listsResponse } = await listLists({});

        if (listsError) {
          throw createActionableError(listsResponse.status, listsError as any, {
            operation: "get_plannable_tasks",
            params: args,
          });
        }

        const allItems: TodoItem[] = [];
        for (const list of listsData!.lists!) {
          const { data: itemsData, error: itemsError, response: itemsResponse } = await listItems({
            path: { list_id: list.id! },
            query: {
              status: statuses as any,
              page_size: 100,
            },
          });

          if (itemsError) {
            throw createActionableError(itemsResponse.status, itemsError as any, {
              operation: "get_plannable_tasks",
              params: args,
            });
          }

          allItems.push(...(itemsData!.items || []));
        }

        // Sort by priority then due_time
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
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
        const { data, error, response } = await listItems({
          path: { list_id: args.list_id as string },
          query: {
            status: statuses as any,
            sort_by: "due_time",
            sort_dir: "asc",
            page_size: 100,
          },
        });

        if (error) {
          throw createActionableError(response.status, error as any, {
            operation: "get_overdue_tasks",
            params: args,
          });
        }

        const overdue = (data!.items || []).filter((item) => item.due_time && item.due_time < now);
        return { items: overdue };
      } else {
        const { data: listsData, error: listsError, response: listsResponse } = await listLists({});

        if (listsError) {
          throw createActionableError(listsResponse.status, listsError as any, {
            operation: "get_overdue_tasks",
            params: args,
          });
        }

        const allOverdue: TodoItem[] = [];
        for (const list of listsData!.lists!) {
          const { data: itemsData, error: itemsError, response: itemsResponse } = await listItems({
            path: { list_id: list.id! },
            query: {
              status: statuses as any,
              page_size: 100,
            },
          });

          if (itemsError) {
            throw createActionableError(itemsResponse.status, itemsError as any, {
              operation: "get_overdue_tasks",
              params: args,
            });
          }

          const overdue = (itemsData!.items || []).filter((item) => item.due_time && item.due_time < now);
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
        const { data, error, response } = await listItems({
          path: { list_id: args.list_id as string },
          query: {
            status: statuses as any,
            sort_by: "due_time",
            sort_dir: "asc",
            page_size: 100,
          },
        });

        if (error) {
          throw createActionableError(response.status, error as any, {
            operation: "get_tasks_due_soon",
            params: args,
          });
        }

        const dueSoon = (data!.items || []).filter((item) => item.due_time && item.due_time >= nowISO && item.due_time <= future);
        return { items: dueSoon };
      } else {
        const { data: listsData, error: listsError, response: listsResponse } = await listLists({});

        if (listsError) {
          throw createActionableError(listsResponse.status, listsError as any, {
            operation: "get_tasks_due_soon",
            params: args,
          });
        }

        const allDueSoon: TodoItem[] = [];
        for (const list of listsData!.lists!) {
          const { data: itemsData, error: itemsError, response: itemsResponse } = await listItems({
            path: { list_id: list.id! },
            query: {
              status: statuses as any,
              page_size: 100,
            },
          });

          if (itemsError) {
            throw createActionableError(itemsResponse.status, itemsError as any, {
              operation: "get_tasks_due_soon",
              params: args,
            });
          }

          const dueSoon = (itemsData!.items || []).filter((item) => item.due_time && item.due_time >= nowISO && item.due_time <= future);
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
        const { data, error, response } = await listItems({
          path: { list_id: args.list_id as string },
          query: {
            status: statuses as any,
            tags: [args.tag as string],
            sort_by: "priority",
            sort_dir: "desc",
            page_size: 100,
          },
        });

        if (error) {
          throw createActionableError(response.status, error as any, {
            operation: "get_tasks_by_tag",
            params: args,
          });
        }

        return data;
      } else {
        const { data: listsData, error: listsError, response: listsResponse } = await listLists({});

        if (listsError) {
          throw createActionableError(listsResponse.status, listsError as any, {
            operation: "get_tasks_by_tag",
            params: args,
          });
        }

        const allItems: TodoItem[] = [];
        for (const list of listsData!.lists!) {
          const { data: itemsData, error: itemsError, response: itemsResponse } = await listItems({
            path: { list_id: list.id! },
            query: {
              status: statuses as any,
              tags: [args.tag as string],
              page_size: 100,
            },
          });

          if (itemsError) {
            throw createActionableError(itemsResponse.status, itemsError as any, {
              operation: "get_tasks_by_tag",
              params: args,
            });
          }

          allItems.push(...(itemsData!.items || []));
        }

        // Sort by priority
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
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
        const { data, error, response } = await listItems({
          path: { list_id: args.list_id as string },
          query: {
            status: statuses as any,
            page_size: 100,
          },
        });

        if (error) {
          throw createActionableError(response.status, error as any, {
            operation: "get_workload_summary",
            params: args,
          });
        }

        allItems = data!.items || [];
      } else {
        const { data: listsData, error: listsError, response: listsResponse } = await listLists({});

        if (listsError) {
          throw createActionableError(listsResponse.status, listsError as any, {
            operation: "get_workload_summary",
            params: args,
          });
        }

        for (const list of listsData!.lists!) {
          const { data: itemsData, error: itemsError, response: itemsResponse } = await listItems({
            path: { list_id: list.id! },
            query: {
              status: statuses as any,
              page_size: 100,
            },
          });

          if (itemsError) {
            throw createActionableError(itemsResponse.status, itemsError as any, {
              operation: "get_workload_summary",
              params: args,
            });
          }

          allItems.push(...(itemsData!.items || []));
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

        if (item.tags) {
          for (const tag of item.tags) {
            if (!byTag[tag]) {
              byTag[tag] = { count: 0, hours: 0 };
            }
            byTag[tag].count++;
            byTag[tag].hours += hours;
          }
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
      const { data, error, response } = await createItem({
        path: { list_id: args.list_id as string },
        body: {
          title: args.title as string,
          priority: (args.priority as any) || "medium",
          due_time: args.due_time as string | undefined,
          tags: args.tags as string[] | undefined,
          estimated_duration: args.estimated_duration as string | undefined,
        },
      });

      if (error) {
        throw createActionableError(response.status, error as any, {
          operation: "quick_add_task",
          params: args,
        });
      }

      return data;
    }

    default:
      throw new Error(`Unknown planning tool: ${name}`);
  }
}
