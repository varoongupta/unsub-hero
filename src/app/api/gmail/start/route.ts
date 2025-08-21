import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOAuthClient } from "@/lib/gmail";
import { GMAIL_SCOPES } from "@/lib/gmail";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", process.env.APP_URL || "http://localhost:3000"));
  const oauth2 = getOAuthClient();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    include_granted_scopes: true,
    state: encodeURIComponent(JSON.stringify({ redirect: "/dashboard" })),
  });
  return NextResponse.redirect(url);
}


