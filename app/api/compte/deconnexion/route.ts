import { signOut } from "@/lib/accounts/session";

export async function POST() {
  await signOut();
  return Response.json({ ok: true });
}
