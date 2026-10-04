import type { Metadata } from "next";
import { LoginGate, PageHeader } from "@/components/account/LoginGate";
import { NotificationsList } from "@/components/account/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <PageHeader title="Notifications" />
      <LoginGate icon="bell" title="Reste informé·e" text="Réponses des tatoueurs, confirmations et rappels de rendez-vous.">
        <NotificationsList />
      </LoginGate>
    </main>
  );
}
