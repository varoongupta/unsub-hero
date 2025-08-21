import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@/components/AppShell";
import SendersClient from "./SendersClient";
import HistoryClient from "./HistoryClient";
import SettingsClient from "./SettingsClient";

export default async function DashboardPage(props: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="p-8">
        <p>Please sign in to view your dashboard.</p>
        <Link href="/sign-in" className="underline">Sign in</Link>
      </main>
    );
  }

  const sp = await props.searchParams || {};
  const tab = (typeof sp.tab === "string" ? sp.tab : Array.isArray(sp.tab) ? sp.tab[0] : undefined) || "senders";

  return (
    <AppShell currentTab={tab}>
      {tab === "senders" && <SendersClient />}
      {tab === "history" && <HistoryClient />}
      {tab === "settings" && <SettingsClient />}
    </AppShell>
  );
}


