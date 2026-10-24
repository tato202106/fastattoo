import "server-only";
import { cookies } from "next/headers";
import { isTokenFormat, newToken } from "../auth/password";
import { accountForSession, createSession, deleteSession, SESSION_DAYS, type Account } from "./db";

/** Cookie httpOnly de connexion à l'espace tatoueur (jeton aléatoire, empreinte en base). */
export const ACCOUNT_COOKIE = "ft_account";

const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * SESSION_DAYS };

/** Connecte le compte sur ce navigateur. */
export async function signIn(accountId: number): Promise<void> {
  const token = newToken();
  await createSession(accountId, token);
  (await cookies()).set(ACCOUNT_COOKIE, token, cookieOptions);
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ACCOUNT_COOKIE)?.value;
  if (isTokenFormat(token)) await deleteSession(token).catch(() => {});
  jar.delete(ACCOUNT_COOKIE);
}

/** Compte connecté sur ce navigateur, ou null. */
export async function currentAccount(): Promise<Account | null> {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!isTokenFormat(token)) return null;
  try {
    return await accountForSession(token);
  } catch (e) {
    console.error("[compte] lecture de la session impossible :", e);
    return null;
  }
}
