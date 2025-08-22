import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOAuthClient } from "@/lib/gmail";
import { GMAIL_SCOPES } from "@/lib/gmail";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    const base = process.env.APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/sign-in", base));
  }
  const oauth2 = getOAuthClient();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.APP_URL}/api/gmail/callback`;

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    include_granted_scopes: true,
    redirect_uri: redirectUri, // ← ensure present
    state: encodeURIComponent(JSON.stringify({ redirect: "/dashboard" })),
  });

  return NextResponse.redirect(url);
}

