import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import SendersClient from "./SendersClient";
import HistoryClient from "./HistoryClient";
import SettingsClient from "./SettingsClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage(props: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
        <h1 className="text-3xl font-semibold">Unsub Hero</h1>
        <p className="text-neutral-500">Bulk unsubscribe and tidy your inbox</p>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connect your Gmail account</CardTitle>
            <CardDescription>
              Sign in to start managing your email subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Check if user has Gmail connected
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  const hasGmailConnected = user ? await prisma.gmailToken.findFirst({ where: { userId: user.id } }) : false;

  const sp = await props.searchParams || {};
  const tab = (typeof sp.tab === "string" ? sp.tab : Array.isArray(sp.tab) ? sp.tab[0] : undefined) || "senders";

  // If user is signed in but doesn't have Gmail connected, show connection prompt
  if (!hasGmailConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
        <h1 className="text-3xl font-semibold">Unsub Hero</h1>
        <p className="text-neutral-500">Bulk unsubscribe and tidy your inbox</p>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connect your Gmail account</CardTitle>
            <CardDescription>
              Connect your Gmail account to start managing your email subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/api/gmail/start">Connect Gmail</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AppShell currentTab={tab}>
      {tab === "senders" && <SendersClient />}
      {tab === "history" && <HistoryClient />}
      {tab === "settings" && <SettingsClient />}
    </AppShell>
  );
}


