import "server-only";
import { cookies } from "next/headers";
import { ADMIN_SESSION_HOURS, adminToken, verifyAdminToken } from "../auth/admin";

const ADMIN_COOKIE = "ft_admin";

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  return verifyAdminToken(process.env.ADMIN_PASSWORD, (await cookies()).get(ADMIN_COOKIE)?.value, Date.now());
}

export async function signInAdmin(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, adminToken(process.env.ADMIN_PASSWORD!, Date.now()), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function signOutAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
