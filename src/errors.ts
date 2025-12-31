import type { ActionableError, ErrorResponse, RequestContext } from "./types.js";

/**
 * Converts API error responses into actionable, user-friendly error messages with recovery guidance.
 *
 * This function translates raw API errors into structured ActionableError objects that include:
 * - Clear error messages suitable for end users
 * - Specific field-level validation guidance
 * - Concrete recovery actions and next steps
 * - Valid values for enum fields when applicable
 *
 * @param status - HTTP status code from the API response (e.g., 400, 404, 409, 500)
 * @param apiError - Raw error response from the Mono API containing error code, message, and details
 * @param context - Request context including operation name, parameters, and resource identifiers
 * @returns Actionable error object with user-friendly message, suggestion, and recovery action
 *
 * @example
 * ```typescript
 * const { error, response } = await createItem({ body: { title: "" } });
 * if (error) {
 *   const actionable = createActionableError(response.status, error, {
 *     operation: "create_item",
 *     params: { title: "" }
 *   });
 *   // actionable.error: "Title is required"
 *   // actionable.suggestion: "Every task and list must have a title..."
 *   // actionable.recovery_action: "Add a 'title' field with 1-255 characters."
 * }
 * ```
 */
export function createActionableError(
  status: number,
  apiError: ErrorResponse,
  context: RequestContext
): ActionableError {
  const { code, message, details } = apiError.error;
  const field = details[0]?.field;
  const issue = details[0]?.issue;

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION ERRORS (400) - Field-specific guidance
  // ═══════════════════════════════════════════════════════════════

  if (code === "VALIDATION_ERROR" && field) {
    const validationErrors: Record<string, ActionableError> = {
      // Title validation
      "title:required field missing": {
        error: "Title is required",
        code: "VALIDATION_ERROR",
        field: "title",
        suggestion: "Every task and list must have a title. Provide a non-empty title string.",
        recovery_action: "Add a 'title' field with 1-255 characters.",
      },
      "title:must be 255 characters or less": {
        error: "Title too long",
        code: "VALIDATION_ERROR",
        field: "title",
        suggestion: "Title exceeds 255 character limit. Shorten it or split into multiple tasks.",
        recovery_action: "Truncate title to 255 characters or create subtasks.",
      },

      // Status validation
      "status:value is required when status is in update_mask": {
        error: "Status value missing",
        code: "VALIDATION_ERROR",
        field: "status",
        suggestion: "You included 'status' in update_mask but didn't provide a status value.",
        recovery_action: "Either remove 'status' from update_mask, or provide item.status.",
        valid_values: ["todo", "in_progress", "blocked", "done", "archived", "cancelled"],
      },
      "status:invalid task status": {
        error: "Invalid status value",
        code: "VALIDATION_ERROR",
        field: "status",
        suggestion: "The status value is not recognized.",
        recovery_action: "Use one of the valid status values.",
        valid_values: ["todo", "in_progress", "blocked", "done", "archived", "cancelled"],
      },

      // Priority validation
      "priority:invalid priority level": {
        error: "Invalid priority value",
        code: "VALIDATION_ERROR",
        field: "priority",
        suggestion: "The priority value is not recognized.",
        recovery_action: "Use one of the valid priority values.",
        valid_values: ["low", "medium", "high", "urgent"],
      },

      // ID validation
      "id:invalid ID format": {
        error: "Invalid UUID format",
        code: "VALIDATION_ERROR",
        field: "id",
        suggestion: "IDs must be valid UUIDs (e.g., '550e8400-e29b-41d4-a716-446655440000').",
        recovery_action: "Use list_lists or list_items to get valid IDs.",
      },

      // Recurrence validation
      "recurrence_pattern:invalid recurrence pattern": {
        error: "Invalid recurrence pattern",
        code: "VALIDATION_ERROR",
        field: "recurrence_pattern",
        suggestion: "The recurrence pattern is not recognized.",
        recovery_action: "Use one of the valid recurrence patterns.",
        valid_values: ["daily", "weekly", "biweekly", "monthly", "yearly", "quarterly", "weekdays"],
      },
      "recurrence_pattern:value is required when recurrence_pattern is in update_mask": {
        error: "Recurrence pattern value missing",
        code: "VALIDATION_ERROR",
        field: "recurrence_pattern",
        suggestion: "You included 'recurrence_pattern' in update_mask but didn't provide a value.",
        recovery_action: "Either remove from update_mask or provide template.recurrence_pattern.",
        valid_values: ["daily", "weekly", "biweekly", "monthly", "yearly", "quarterly", "weekdays"],
      },

      // Duration validation
      "estimated_duration:invalid duration format (expected ISO 8601 duration like 'PT1H30M')": {
        error: "Invalid duration format",
        code: "VALIDATION_ERROR",
        field: "estimated_duration",
        suggestion: "Duration must be ISO 8601 format: PT[hours]H[minutes]M",
        recovery_action: "Examples: 'PT30M' (30 min), 'PT1H' (1 hour), 'PT2H30M' (2.5 hours), 'PT1H15M' (1h 15m).",
      },
      "estimated_duration:duration cannot be empty": {
        error: "Empty duration",
        code: "VALIDATION_ERROR",
        field: "estimated_duration",
        suggestion: "Duration was provided but is empty string.",
        recovery_action: "Provide a valid duration like 'PT1H' or remove the field entirely.",
      },

      // Generation window validation
      "generation_window_days:must be between 1 and 365": {
        error: "Invalid generation window",
        code: "VALIDATION_ERROR",
        field: "generation_window_days",
        suggestion: "Generation window must be 1-365 days.",
        recovery_action: "Use a value between 1 (generate 1 day ahead) and 365 (1 year ahead). Default is 30.",
      },

      // ETag validation
      "etag:must be a numeric string (e.g., \"1\", \"2\")": {
        error: "Invalid ETag format",
        code: "VALIDATION_ERROR",
        field: "etag",
        suggestion: "ETag for optimistic concurrency must be a quoted numeric string.",
        recovery_action: "Get the current item first - its etag field contains the correct format.",
      },

      // Recurring template requirement
      "recurring_template_id:required for recurring tasks": {
        error: "Missing template ID for recurring task",
        code: "VALIDATION_ERROR",
        field: "recurring_template_id",
        suggestion: "Tasks with instance_date must reference a recurring template.",
        recovery_action: "Either use create_item without instance_date, or provide recurring_template_id.",
      },
    };

    const key = `${field}:${issue}`;
    if (validationErrors[key]) {
      return validationErrors[key];
    }

    // Fallback for unknown validation errors
    return {
      error: message,
      code: "VALIDATION_ERROR",
      field,
      suggestion: `Validation failed for field '${field}': ${issue}`,
      recovery_action: "Check the field value and format.",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // NOT FOUND ERRORS (404) - Resource-specific recovery
  // ═══════════════════════════════════════════════════════════════

  if (code === "NOT_FOUND") {
    if (message.includes("list")) {
      return {
        error: "List not found",
        code: "NOT_FOUND",
        suggestion: `No list exists with ID '${context.params.list_id}'.`,
        recovery_action: "Use list_lists to see all available lists and their IDs.",
      };
    }
    if (message.includes("item")) {
      return {
        error: "Item not found",
        code: "NOT_FOUND",
        suggestion: `No item exists with ID '${context.params.item_id}' in this list.`,
        recovery_action: "Use list_items with the list_id to see valid item IDs.",
      };
    }
    if (message.includes("recurring template")) {
      return {
        error: "Recurring template not found",
        code: "NOT_FOUND",
        suggestion: `No template exists with ID '${context.params.template_id}'.`,
        recovery_action: "Use list_recurring_templates with the list_id to see valid template IDs.",
      };
    }
    return {
      error: "Resource not found",
      code: "NOT_FOUND",
      suggestion: "The requested resource does not exist.",
      recovery_action: "Verify the ID is correct. Use list operations to find valid IDs.",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH ERRORS (401) - API key issues
  // ═══════════════════════════════════════════════════════════════

  if (code === "UNAUTHORIZED") {
    return {
      error: "Authentication failed",
      code: "UNAUTHORIZED",
      suggestion: "The API key is invalid, expired, or missing.",
      recovery_action: "Verify MONO_API_KEY environment variable. Keys start with 'sk-'. Contact user if key needs regeneration.",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFLICT ERRORS (409) - Optimistic concurrency
  // ═══════════════════════════════════════════════════════════════

  if (code === "CONFLICT") {
    return {
      error: "Resource was modified",
      code: "CONFLICT",
      suggestion: "Another process updated this item since you last fetched it.",
      recovery_action: "Fetch the item again to get the latest etag, then retry your update with the new etag.",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERNAL ERRORS (500) - Server issues
  // ═══════════════════════════════════════════════════════════════

  if (code === "INTERNAL_ERROR" || status >= 500) {
    return {
      error: "Server error",
      code: "INTERNAL_ERROR",
      suggestion: "The Mono API encountered an internal error.",
      recovery_action: "Wait a few seconds and retry. If persistent, the service may be experiencing issues.",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // INVALID REQUEST (400) - General bad request
  // ═══════════════════════════════════════════════════════════════

  if (code === "INVALID_REQUEST") {
    // update_mask errors
    if (message.includes("update_mask")) {
      return {
        error: "Invalid update_mask",
        code: "INVALID_REQUEST",
        suggestion: "update_mask specifies which fields to update. It cannot be empty.",
        recovery_action: "Provide update_mask array with fields to update: ['title', 'status', 'priority', 'due_time', 'tags', 'estimated_duration', 'actual_duration', 'timezone']",
      };
    }
    return {
      error: message,
      code: "INVALID_REQUEST",
      suggestion: "The request format is invalid.",
      recovery_action: "Check required parameters and their formats.",
    };
  }

  // Fallback
  return {
    error: message || "Unknown error",
    code: code || "UNKNOWN",
    suggestion: "An unexpected error occurred.",
    recovery_action: "Check the request parameters and retry.",
  };
}
