import type { Metadata } from "next";
import { PageHeader } from "@/components/account/LoginGate";
import { FavoritesList } from "@/components/client/FavoritesList";

export const metadata: Metadata = { title: "Favoris" };

export default function FavoritesPage() {
  return (
    <main className="mx-auto max-w-5xl pb-nav">
      <PageHeader title="Favoris" />
      <FavoritesList />
    </main>
  );
}
