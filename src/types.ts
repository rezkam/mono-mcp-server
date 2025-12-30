// TypeScript types matching Mono API OpenAPI spec

// Enums
export type ItemStatus = "todo" | "in_progress" | "blocked" | "done" | "archived" | "cancelled";
export type ItemPriority = "low" | "medium" | "high" | "urgent";
export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "quarterly" | "weekdays";
export type SortDirection = "asc" | "desc";
export type ListSortBy = "create_time" | "title";
export type ItemSortBy = "due_time" | "priority" | "created_at" | "updated_at";

// Domain models
export interface TodoList {
  id: string;
  title: string;
  create_time: string;
  total_items?: number;
  undone_items?: number;
}

export interface TodoItem {
  id: string;
  title: string;
  status: ItemStatus;
  priority?: ItemPriority;
  create_time: string;
  updated_at: string;
  due_time?: string;
  tags: string[];
  estimated_duration?: string;
  actual_duration?: string;
  recurring_template_id?: string;
  instance_date?: string;
  timezone?: string;
  etag?: string;
}

export interface RecurringItemTemplate {
  id: string;
  list_id: string;
  title: string;
  tags: string[];
  priority?: ItemPriority;
  estimated_duration?: string;
  recurrence_pattern: RecurrencePattern;
  recurrence_config?: string;
  due_offset?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_generated_until?: string;
  generation_window_days?: number;
}

// Request/Response types
export interface CreateListRequest {
  title: string;
}

export interface CreateListResponse {
  list: TodoList;
}

export interface GetListResponse {
  list: TodoList;
}

export interface ListListsResponse {
  lists: TodoList[];
  next_page_token?: string;
}

export interface CreateItemRequest {
  title: string;
  due_time?: string;
  tags?: string[];
  priority?: ItemPriority;
  estimated_duration?: string;
  recurring_template_id?: string;
  instance_date?: string;
  timezone?: string;
}

export interface CreateItemResponse {
  item: TodoItem;
}

export interface UpdateItemRequest {
  item: Partial<TodoItem>;
  update_mask: string[];
}

export interface UpdateItemResponse {
  item: TodoItem;
}

export interface ListItemsResponse {
  items: TodoItem[];
  next_page_token?: string;
}

export interface CreateRecurringTemplateRequest {
  title: string;
  recurrence_pattern: RecurrencePattern;
  tags?: string[];
  priority?: ItemPriority;
  estimated_duration?: string;
  recurrence_config?: string;
  due_offset?: string;
  generation_window_days?: number;
}

export interface CreateRecurringTemplateResponse {
  template: RecurringItemTemplate;
}

export interface GetRecurringTemplateResponse {
  template: RecurringItemTemplate;
}

export interface UpdateRecurringTemplateRequest {
  template: Partial<RecurringItemTemplate>;
  update_mask: string[];
}

export interface UpdateRecurringTemplateResponse {
  template: RecurringItemTemplate;
}

export interface ListRecurringTemplatesResponse {
  templates: RecurringItemTemplate[];
}

// Error types
export interface ErrorField {
  field: string;
  issue: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details: ErrorField[];
}

export interface ErrorResponse {
  error: ErrorDetail;
}

// Actionable error for MCP responses
export interface ActionableError {
  error: string;
  code: string;
  field?: string;
  suggestion: string;
  recovery_action?: string;
  valid_values?: string[];
}

// Request context for error handling
export interface RequestContext {
  operation: string;
  params: Record<string, unknown>;
  resourceType?: string;
  resourceId?: string;
  hint?: string;
}
