import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatThread } from "@/components/chat/ChatThread";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  return (
    <main>
      <Suspense>
        <ChatThread conversationId={id} />
      </Suspense>
    </main>
  );
}
