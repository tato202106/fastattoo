import type { Metadata } from "next";
import { LoginGate } from "@/components/account/LoginGate";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";

export const metadata: Metadata = { title: { default: "Espace tatoueur", template: "%s · Espace tatoueur · Fastattoo" }, robots: { index: false } };

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoginGate role="artist" icon="grid" title="Espace tatoueur·se" text="Gère tes demandes, ton calendrier et ton portfolio depuis ton téléphone.">
      <SubscriptionGate>{children}</SubscriptionGate>
    </LoginGate>
  );
}
