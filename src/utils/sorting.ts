import type { TodoItem } from "../client.js";

/**
 * Priority order mapping for task sorting.
 * Lower numbers indicate higher priority.
 */
export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Sorts tasks by priority (urgent > high > medium > low), then by due date (earliest first).
 *
 * Tasks with due dates are prioritized over tasks without due dates within the same priority level.
 *
 * @param a - First task to compare
 * @param b - Second task to compare
 * @returns Negative if a should come before b, positive if b should come before a, 0 if equal
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { title: "Low prio, no due", priority: "low" },
 *   { title: "High prio, due soon", priority: "high", due_time: "2025-01-01T00:00:00Z" },
 *   { title: "Medium prio, no due", priority: "medium" }
 * ];
 * tasks.sort(sortByPriorityAndDueDate);
 * // Result: High prio task, Medium prio task, Low prio task
 * ```
 */
export function sortByPriorityAndDueDate(a: TodoItem, b: TodoItem): number {
  const aPrio = PRIORITY_ORDER[a.priority || "medium"];
  const bPrio = PRIORITY_ORDER[b.priority || "medium"];

  // First compare by priority
  if (aPrio !== bPrio) {
    return aPrio - bPrio;
  }

  // If same priority, sort by due date
  if (a.due_time && b.due_time) {
    return new Date(a.due_time).getTime() - new Date(b.due_time).getTime();
  }

  // Tasks with due dates come before tasks without
  if (a.due_time) return -1;
  if (b.due_time) return 1;

  return 0;
}

/**
 * Sorts tasks by due date (earliest first).
 *
 * Tasks without due dates are sorted to the end.
 *
 * @param a - First task to compare
 * @param b - Second task to compare
 * @returns Negative if a's due date is earlier, positive if b's is earlier, 0 if equal
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { title: "Due later", due_time: "2025-12-31T00:00:00Z" },
 *   { title: "Due soon", due_time: "2025-01-01T00:00:00Z" },
 *   { title: "No due date" }
 * ];
 * tasks.sort(sortByDueDate);
 * // Result: Due soon, Due later, No due date
 * ```
 */
export function sortByDueDate(a: TodoItem, b: TodoItem): number {
  if (!a.due_time || !b.due_time) {
    if (a.due_time) return -1;
    if (b.due_time) return 1;
    return 0;
  }

  return new Date(a.due_time).getTime() - new Date(b.due_time).getTime();
}
