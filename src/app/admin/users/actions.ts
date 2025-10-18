/**
 * Server Actions for User Management
 * Wraps Better Auth admin API
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { headers } from "next/headers";

// ============ Schemas ============

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8),
  role: z.enum(["user", "admin"]).default("user"),
});

const UpdateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const BanUserSchema = z.object({
  reason: z.string().min(1),
  expiresInDays: z.number().int().positive().optional(),
});

// ============ Actions ============

/**
 * Get all users (Better Auth admin endpoint)
 */
export async function getUsers() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Better Auth provides the admin.listUsers method
  const result = await auth.api.listUsers({
    query: {
      limit: 100,
    },
    headers: await headers(),
  });

  return result;
}

/**
 * Get user by ID
 */
export async function getUserById({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const result = await auth.api.listUsers({
    query: {
      limit: 100,
    },
    headers: await headers(),
  });

  const user = result.users.find((u: any) => u.id === id);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Create new user (Better Auth admin endpoint)
 */
export async function createUser(input: z.infer<typeof CreateUserSchema>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = CreateUserSchema.parse(input);

  const result = await auth.api.createUser({
    body: {
      ...validated,
    },
    headers: await headers(),
  });

  revalidatePath("/admin/users");

  return result;
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  input: z.infer<typeof UpdateUserRoleSchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = UpdateUserRoleSchema.parse(input);

  await auth.api.setRole({
    body: {
      userId,
      role: validated.role,
    },
    headers: await headers(),
  });

  revalidatePath("/admin/users");
}

/**
 * Ban user (Better Auth admin endpoint)
 */
export async function banUser(
  userId: string,
  input: z.infer<typeof BanUserSchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = BanUserSchema.parse(input);

  const banExpires = validated.expiresInDays
    ? new Date(Date.now() + validated.expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  await auth.api.banUser({
    body: {
      userId,
      banReason: validated.reason,
      banExpiresIn: banExpires ? banExpires.getTime() : undefined,
    },
    headers: await headers(),
  });

  revalidatePath("/admin/users");
}

/**
 * Unban user (Better Auth admin endpoint)
 */
export async function unbanUser({ userId }: { userId: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await auth.api.unbanUser({
    body: {
      userId,
    },
    headers: await headers(),
  });

  revalidatePath("/admin/users");
}

/**
 * Revoke user sessions (Better Auth admin endpoint)
 */
export async function revokeUserSessions({ userId }: { userId: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await auth.api.revokeUserSessions({
    body: {
      userId,
    },
    headers: await headers(),
  });

  revalidatePath("/admin/users");
}
