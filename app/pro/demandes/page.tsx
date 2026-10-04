import { RequestsInbox } from "@/components/pro/RequestsInbox";

export const metadata = { title: "Demandes" };

export default function ProRequestsPage() {
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <RequestsInbox />
    </main>
  );
}
