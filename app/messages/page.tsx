import type { Metadata } from "next";
import { LoginGate, PageHeader } from "@/components/account/LoginGate";
import { ConversationList } from "@/components/chat/ConversationList";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <PageHeader title="Messages" />
      <LoginGate icon="message" title="Tes conversations" text="Connecte-toi pour échanger avec les tatoueurs et suivre tes demandes.">
        <ConversationList />
      </LoginGate>
    </main>
  );
}
