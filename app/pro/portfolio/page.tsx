import { Suspense } from "react";
import { PortfolioManager } from "@/components/pro/PortfolioManager";
import { PublishedToast } from "@/components/pro/PublishedToast";

export const metadata = { title: "Portfolio" };

export default function ProPortfolioPage() {
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <Suspense>
        <PublishedToast />
      </Suspense>
      <PortfolioManager />
    </main>
  );
}
