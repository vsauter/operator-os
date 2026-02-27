/**
 * Zod validation schemas for API request bodies.
 * Provides type-safe input validation with helpful error messages.
 */

import { z } from "zod";

// Safe ID pattern - only lowercase letters, numbers, and hyphens
const safeIdPattern = /^[a-z0-9-]+$/;

/**
 * Briefing request validation
 */
export const briefingRequestSchema = z.object({
  operatorId: z
    .string()
    .min(1, "Operator ID is required")
    .max(100, "Operator ID too long")
    .regex(safeIdPattern, "Operator ID can only contain lowercase letters, numbers, and hyphens"),
  taskId: z
    .string()
    .max(100, "Task ID too long")
    .regex(safeIdPattern, "Task ID can only contain lowercase letters, numbers, and hyphens")
    .optional(),
});

export type BriefingRequest = z.infer<typeof briefingRequestSchema>;

/**
 * Operator source validation (connector-based)
 */
const connectorSourceSchema = z.object({
  connector: z.string().min(1).max(100),
  fetch: z.string().min(1).max(100),
  params: z.record(z.unknown()).optional(),
});

/**
 * Operator source validation (legacy format)
 */
const legacySourceSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  connection: z.object({
    command: z.string().min(1).max(500),
    args: z.array(z.string().max(1000)),
    env: z.record(z.string()).optional(),
  }),
  tool: z.string().min(1).max(100).optional(),
  args: z.record(z.unknown()).optional(),
});

/**
 * Operator task validation
 */
const taskSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(10000),
  default: z.boolean().optional(),
});

/**
 * Full operator configuration validation
 */
export const operatorConfigSchema = z.object({
  id: z
    .string()
    .min(1, "Operator ID is required")
    .max(100, "Operator ID too long")
    .regex(safeIdPattern, "Operator ID can only contain lowercase letters, numbers, and hyphens"),
  name: z
    .string()
    .min(1, "Operator name is required")
    .max(200, "Operator name too long"),
  description: z.string().max(1000).optional(),
  sources: z
    .array(z.union([connectorSourceSchema, legacySourceSchema]))
    .min(1, "At least one source is required")
    .max(20, "Too many sources (max 20)"),
  tasks: z.record(taskSchema).optional(),
  briefing: z.object({ prompt: z.string().max(10000) }).optional(),
});

export type OperatorConfig = z.infer<typeof operatorConfigSchema>;

/**
 * Goals configuration validation
 */
const goalSchema = z.object({
  id: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  metric: z.string().max(100).optional(),
  target: z.number().optional(),
  deadline: z.string().max(50).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export const goalsConfigSchema = z.object({
  organization: z
    .object({
      name: z.string().max(200).optional(),
      role: z.string().max(200).optional(),
    })
    .optional(),
  goals: z.array(goalSchema).max(50).optional(),
  context: z.string().max(5000).optional(),
});

export type GoalsConfig = z.infer<typeof goalsConfigSchema>;

/**
 * Goals update request validation
 */
export const goalsUpdateSchema = z.object({
  raw: z
    .string()
    .min(1, "YAML content is required")
    .max(50000, "YAML content too large (max 50KB)"),
});

export type GoalsUpdateRequest = z.infer<typeof goalsUpdateSchema>;

/**
 * Connection test request validation
 */
export const connectionTestSchema = z.object({
  connector: z
    .string()
    .min(1, "Connector is required")
    .max(100, "Connector too long"),
  fetch: z.string().min(1, "Fetch is required").max(100, "Fetch too long"),
  params: z.record(z.unknown()).optional(),
});

export type ConnectionTestRequest = z.infer<typeof connectionTestSchema>;

/**
 * Helper to format Zod errors into a user-friendly message
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((e) => {
      const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
      return `${path}${e.message}`;
    })
    .join("; ");
}

/**
 * Validate request body with a Zod schema.
 * Returns parsed data or throws with formatted error.
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodError(result.error) };
}
