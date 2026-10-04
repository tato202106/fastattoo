import { Dashboard } from "@/components/pro/Dashboard";

export const metadata = { title: "Dashboard" };

export default function ProDashboardPage() {
  return (
    <main className="mx-auto max-w-3xl pb-nav">
      <Dashboard />
    </main>
  );
}
