import type { TodoItem } from "../client.js";

/**
 * Checks if a task is overdue (due date is in the past).
 *
 * @param item - Task to check
 * @param now - Current time (defaults to now)
 * @returns True if the task has a due date and it's in the past
 *
 * @example
 * ```typescript
 * const task = { title: "Overdue task", due_time: "2024-01-01T00:00:00Z" };
 * if (isOverdue(task)) {
 *   console.log("This task is overdue!");
 * }
 * ```
 */
export function isOverdue(item: TodoItem, now: Date = new Date()): boolean {
  if (!item.due_time) return false;
  return item.due_time < now.toISOString();
}

/**
 * Checks if a task is due within the specified number of days.
 *
 * Returns true for tasks with due dates between now and N days from now.
 * Does not include overdue tasks.
 *
 * @param item - Task to check
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @param now - Current time (defaults to now)
 * @returns True if the task is due within the specified timeframe
 *
 * @example
 * ```typescript
 * const task = { title: "Due this week", due_time: "2025-01-05T00:00:00Z" };
 * if (isDueSoon(task, 7)) {
 *   console.log("This task is due within 7 days");
 * }
 * ```
 */
export function isDueSoon(item: TodoItem, daysAhead: number = 7, now: Date = new Date()): boolean {
  if (!item.due_time) return false;

  const nowISO = now.toISOString();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const futureISO = futureDate.toISOString();

  return item.due_time >= nowISO && item.due_time <= futureISO;
}

/**
 * Filters tasks to only include overdue items.
 *
 * @param items - Array of tasks to filter
 * @param now - Current time (defaults to now)
 * @returns Array of overdue tasks
 *
 * @example
 * ```typescript
 * const tasks = await listItems({ list_id: "123" });
 * const overdue = filterOverdue(tasks.items);
 * console.log(`You have ${overdue.length} overdue tasks`);
 * ```
 */
export function filterOverdue(items: TodoItem[], now: Date = new Date()): TodoItem[] {
  return items.filter((item) => isOverdue(item, now));
}

/**
 * Filters tasks to only include items due within the specified number of days.
 *
 * @param items - Array of tasks to filter
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @param now - Current time (defaults to now)
 * @returns Array of tasks due soon
 *
 * @example
 * ```typescript
 * const tasks = await listItems({ list_id: "123" });
 * const dueSoon = filterDueSoon(tasks.items, 3);
 * console.log(`You have ${dueSoon.length} tasks due in the next 3 days`);
 * ```
 */
export function filterDueSoon(items: TodoItem[], daysAhead: number = 7, now: Date = new Date()): TodoItem[] {
  return items.filter((item) => isDueSoon(item, daysAhead, now));
}

/**
 * Calculates the date range for "due soon" filtering.
 *
 * @param daysAhead - Number of days to look ahead
 * @param now - Current time (defaults to now)
 * @returns Object with nowISO and futureISO strings for date comparison
 *
 * @example
 * ```typescript
 * const { nowISO, futureISO } = getDueSoonDateRange(7);
 * // Use in API queries or manual filtering
 * ```
 */
export function getDueSoonDateRange(
  daysAhead: number = 7,
  now: Date = new Date()
): { nowISO: string; futureISO: string } {
  const nowISO = now.toISOString();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const futureISO = futureDate.toISOString();
  return { nowISO, futureISO };
}
