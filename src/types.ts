// Error handling types (not from OpenAPI spec)

/**
 * Structured error response for MCP tool executions with actionable guidance.
 *
 * This interface provides end-user-friendly error information that goes beyond
 * raw API error messages, including specific suggestions and recovery steps.
 *
 * @example
 * ```typescript
 * const actionableError: ActionableError = {
 *   error: "Title is required",
 *   code: "VALIDATION_ERROR",
 *   field: "title",
 *   suggestion: "Every task and list must have a title. Provide a non-empty title string.",
 *   recovery_action: "Add a 'title' field with 1-255 characters.",
 *   valid_values: undefined
 * };
 * ```
 */
export interface ActionableError {
  /** User-friendly error message describing what went wrong */
  error: string;
  /** Error code from the API (e.g., VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED) */
  code: string;
  /** Specific field that caused the error (for validation errors) */
  field?: string;
  /** Detailed explanation of why the error occurred and what it means */
  suggestion: string;
  /** Concrete next step the user should take to resolve the error */
  recovery_action?: string;
  /** List of valid values for enum fields (when applicable) */
  valid_values?: string[];
}

/**
 * Context information about an API request for error handling.
 *
 * Used to provide contextual information when converting API errors
 * into actionable errors with specific recovery guidance.
 *
 * @example
 * ```typescript
 * const context: RequestContext = {
 *   operation: "create_item",
 *   params: { list_id: "123", title: "" },
 *   resourceType: "item",
 *   resourceId: undefined,
 *   hint: "Creating a new task"
 * };
 * ```
 */
export interface RequestContext {
  /** Name of the MCP tool operation being executed (e.g., "create_item", "list_lists") */
  operation: string;
  /** Parameters passed to the operation */
  params: Record<string, unknown>;
  /** Type of resource being operated on (e.g., "list", "item", "template") */
  resourceType?: string;
  /** ID of the specific resource being operated on */
  resourceId?: string;
  /** Additional context hint for error messages */
  hint?: string;
}

/**
 * Field-specific error detail from the Mono API.
 *
 * Describes a validation error for a specific field in the request.
 *
 * @example
 * ```typescript
 * const fieldError: ErrorField = {
 *   field: "title",
 *   issue: "required field missing"
 * };
 * ```
 */
export interface ErrorField {
  /** Name of the field that has an error */
  field: string;
  /** Description of what's wrong with the field */
  issue: string;
}

/**
 * Detailed error information from the Mono API.
 *
 * Contains the error code, message, and field-specific details.
 *
 * @example
 * ```typescript
 * const errorDetail: ErrorDetail = {
 *   code: "VALIDATION_ERROR",
 *   message: "Validation failed",
 *   details: [{ field: "title", issue: "required field missing" }]
 * };
 * ```
 */
export interface ErrorDetail {
  /** Error code identifying the type of error */
  code: string;
  /** Human-readable error message */
  message: string;
  /** List of field-specific errors (for validation errors) */
  details: ErrorField[];
}

/**
 * Error response wrapper from the Mono API.
 *
 * Top-level structure for all error responses from the API.
 *
 * @example
 * ```typescript
 * const apiError: ErrorResponse = {
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Validation failed",
 *     details: [{ field: "title", issue: "required field missing" }]
 *   }
 * };
 * ```
 */
export interface ErrorResponse {
  /** Detailed error information */
  error: ErrorDetail;
}
