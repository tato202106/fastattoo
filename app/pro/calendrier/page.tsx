import { CalendarView } from "@/components/pro/CalendarView";

export const metadata = { title: "Calendrier" };

export default function ProCalendarPage() {
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <CalendarView />
    </main>
  );
}
