/**
 * Extracts fields from an arguments object based on an update mask.
 *
 * The update mask specifies which fields should be included in the update.
 * Only fields listed in the mask and present in the args object are included.
 *
 * @param args - Source object containing all possible fields
 * @param updateMask - Array of field names to extract
 * @returns Object containing only the masked fields that exist in args
 *
 * @example
 * ```typescript
 * const args = {
 *   title: "New title",
 *   priority: "high",
 *   status: "done",
 *   irrelevant_field: "ignored"
 * };
 * const updateMask = ["title", "priority"];
 * const fields = extractUpdateFields(args, updateMask);
 * // Result: { title: "New title", priority: "high" }
 * ```
 */
export function extractUpdateFields(
  args: Record<string, unknown>,
  updateMask: string[]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const field of updateMask) {
    if (args[field] !== undefined) {
      fields[field] = args[field];
    }
  }

  return fields;
}

/**
 * Validates that an update mask is not empty.
 *
 * @param updateMask - Update mask array to validate
 * @throws Error if the update mask is empty or undefined
 *
 * @example
 * ```typescript
 * validateUpdateMask(["title"]); // OK
 * validateUpdateMask([]); // Throws error
 * validateUpdateMask(undefined); // Throws error
 * ```
 */
export function validateUpdateMask(updateMask: string[] | undefined): asserts updateMask is string[] {
  if (!updateMask || updateMask.length === 0) {
    throw new Error("update_mask cannot be empty");
  }
}

/**
 * Extracts and validates update fields from arguments.
 *
 * Combines validation and extraction in a single operation.
 *
 * @param args - Source object containing the update_mask and field values
 * @returns Object containing only the fields specified in the update mask
 * @throws Error if update_mask is missing or empty
 *
 * @example
 * ```typescript
 * const args = {
 *   update_mask: ["title", "status"],
 *   title: "Updated title",
 *   status: "done",
 *   other_field: "ignored"
 * };
 * const fields = extractAndValidateUpdateFields(args);
 * // Result: { title: "Updated title", status: "done" }
 * ```
 */
export function extractAndValidateUpdateFields(args: Record<string, unknown>): {
  updateMask: string[];
  fields: Record<string, unknown>;
} {
  const updateMask = args.update_mask as string[] | undefined;
  validateUpdateMask(updateMask);

  const fields = extractUpdateFields(args, updateMask);

  return { updateMask, fields };
}
