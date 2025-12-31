// Error handling types (not from OpenAPI spec)

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

// Error response from API
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
