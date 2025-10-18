import { z } from "zod";

export const CreateApiKeySchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1).max(255),
  expiresIn: z.number().positive().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  scopes: z.array(z.string()).optional(),
  rateLimit: z
    .object({
      enabled: z.boolean().default(false),
      max: z.number().positive().optional(),
      timeWindow: z.number().positive().optional(),
    })
    .optional(),
  metadata: z
    .object({
      type: z.enum(["personal", "organization", "public"]).optional(),
      ipWhitelist: z.array(z.string()).optional(),
      allowedOrigins: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const ListApiKeysSchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  scopes: z.array(z.string()).optional(),
  rateLimit: z
    .object({
      enabled: z.boolean(),
      max: z.number().positive().optional(),
      timeWindow: z.number().positive().optional(),
    })
    .optional(),
  metadata: z
    .object({
      type: z.enum(["personal", "organization", "public"]).optional(),
      ipWhitelist: z.array(z.string()).optional(),
      allowedOrigins: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
});


