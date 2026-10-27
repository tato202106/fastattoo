import { listSlots, setDaySlots } from "@/lib/accounts/db";
import { parseDaySlots } from "@/lib/accounts/availability";
import { currentAccount } from "@/lib/accounts/session";
import { todayISO } from "@/lib/dates";

const unauthorized = () => Response.json({ error: "Connecte-toi à ton espace tatoueur." }, { status: 401 });

/** Créneaux libres à venir du tatoueur connecté. */
export async function GET() {
  const account = await currentAccount();
  if (!account) return unauthorized();
  return Response.json({ slots: await listSlots(account.id) }, { headers: { "Cache-Control": "no-store" } });
}

/** Remplace les créneaux libres d'un jour : { date: "AAAA-MM-JJ", times: ["10:00", …] }. */
export async function PUT(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const body = (await req.json().catch(() => null)) as { date?: unknown; times?: unknown } | null;
  // Tolérance d'un jour : le navigateur peut être en avance sur le serveur (fuseau horaire).
  const parsed = parseDaySlots(body, todayISO(new Date(Date.now() - 86_400_000)));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
  try {
    return Response.json({ slots: await setDaySlots(account.id, parsed.date, parsed.times) });
  } catch (e) {
    console.error("[compte] créneaux :", e);
    return Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
