import { RequestDetail } from "@/components/pro/RequestDetail";

export const metadata = { title: "Demande" };

export default async function ProRequestPage({ params }: PageProps<"/pro/demandes/[id]">) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl">
      <RequestDetail id={id} />
    </main>
  );
}
