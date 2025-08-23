// src/lib/gmail.ts
import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { decryptFromBase64 } from "@/lib/crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

// Resolve the redirect URI once, with a clear error if misconfigured.
function getRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  const fallback =
    process.env.APP_URL && `${process.env.APP_URL.replace(/\/$/, "")}/api/gmail/callback`;
  const uri = explicit || fallback;
  if (!uri) {
    throw new Error(
      "Missing OAuth redirect URI. Set GOOGLE_REDIRECT_URI or APP_URL in environment variables."
    );
  }
  return uri;
}

export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = getRedirectUri(); // ← IMPORTANT
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function makeOAuth(clerkId: string): Promise<OAuth2Client> {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found for OAuth");

  const token = await prisma.gmailToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw new Error("No Gmail tokens on file");

  const oauth2 = getOAuthClient();
  const access = await decryptFromBase64(token.accessToken);
  const refresh = await decryptFromBase64(token.refreshToken);

  oauth2.setCredentials({
    access_token: access,
    refresh_token: refresh,
    expiry_date: token.expiryDate.getTime(),
    scope: token.scope,
  });

  return oauth2;
}

function normalizeEmail(fromHeader: string): { from: string; fromEmail: string } {
  const match = fromHeader.match(/([^<]+)<([^>]+)>/);
  if (match) {
    return { from: match[1].trim(), fromEmail: match[2].trim().toLowerCase() };
  }
  return { from: fromHeader.trim(), fromEmail: fromHeader.trim().toLowerCase() };
}

export async function listTopSenders(auth: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth }) as gmail_v1.Gmail;
  const query = "label:inbox newer_than:90d";
  const messages: string[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      pageToken,
      maxResults: 500,
    });
    const data = res.data as gmail_v1.Schema$ListMessagesResponse;
    (data.messages || []).forEach((m) => m.id && messages.push(m.id));
    pageToken = data.nextPageToken || undefined;
  } while (pageToken);

  const aggregates = new Map<
    string,
    { id: string; from: string; fromEmail: string; listUnsub?: string; count: number; hasHttp: boolean; hasMailto: boolean }
  >();

  const batchSize = 50;
  for (let i = 0; i < messages.length; i += batchSize) {
    const slice = messages.slice(i, i + batchSize);
    const batch = await Promise.all(
      slice.map(async (id): Promise<{ id: string; from: string; fromEmail: string; listUnsub?: string } | null> => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["From", "List-Unsubscribe"],
        });
        const data = msg.data as gmail_v1.Schema$Message;
        const headers = data.payload?.headers || [];
        const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
        if (!from) return null;
        const lu = headers.find((h) => h.name?.toLowerCase() === "list-unsubscribe")?.value || undefined;
        const norm = normalizeEmail(from);
        return { id, ...norm, listUnsub: lu };
      })
    );

    for (const item of batch) {
      if (!item) continue;
      const key = item.fromEmail;
      const prev = aggregates.get(key);
      const hasHttp = !!item.listUnsub?.match(/https?:\/\//i);
      const hasMailto = !!item.listUnsub?.match(/mailto:/i);
      if (!prev) {
        aggregates.set(key, {
          id: item.id,
          from: item.from,
          fromEmail: item.fromEmail,
          listUnsub: item.listUnsub,
          count: 1,
          hasHttp,
          hasMailto,
        });
      } else {
        prev.count += 1;
        if (!prev.listUnsub && item.listUnsub) prev.listUnsub = item.listUnsub;
        prev.hasHttp = prev.hasHttp || hasHttp;
        prev.hasMailto = prev.hasMailto || hasMailto;
      }
    }
  }

  return Array.from(aggregates.values()).sort((a, b) => b.count - a.count);
}

function parseListUnsubscribe(header: string | undefined): string[] {
  if (!header) return [];
  return header
    .split(/,\s*/)
    .map((s) => s.trim().replace(/^<|>$/g, ""))
    .filter(Boolean);
}

export async function performUnsub(auth: OAuth2Client, listUnsub: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const entries = parseListUnsubscribe(listUnsub);

  for (const entry of entries) {
    if (/^https?:\/\//i.test(entry)) {
      try {
        const res = await fetch(entry, { method: "GET" });
        if (res.ok) return { ok: true, method: "http" as const };
      } catch {}
      try {
        const res2 = await fetch(entry, { method: "POST" });
        if (res2.ok) return { ok: true, method: "http" as const };
      } catch {}
    }
  }

  for (const entry of entries) {
    if (/^mailto:/i.test(entry)) {
      try {
        const mailto = new URL(entry);
        const to = mailto.pathname;
        const subject = mailto.searchParams.get("subject") || "Unsubscribe";
        const body = mailto.searchParams.get("body") || "Please unsubscribe me.";
        const raw = Buffer.from(
          [`To: ${to}`, "Subject: " + subject, "Content-Type: text/plain; charset=us-ascii", "", body].join("\r\n")
        )
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
        return { ok: true, method: "mailto" as const };
      } catch {}
    }
  }
  return { ok: false, method: null };
}

export async function trashMessagesByFrom(auth: OAuth2Client, fromEmails: string[], query?: string) {
  const gmail = google.gmail({ version: "v1", auth }) as gmail_v1.Gmail;
  const qBase = query && query.trim().length > 0 ? query : "label:inbox newer_than:90d";
  const deletedCountBySender: Record<string, number> = {};

  for (const fromEmail of fromEmails) {
    const q = `${qBase} from:${fromEmail}`;
    const ids: string[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const res = await gmail.users.messages.list({ userId: "me", q, pageToken, maxResults: 500 });
      const data = res.data as gmail_v1.Schema$ListMessagesResponse;
      (data.messages || []).forEach((m) => m.id && ids.push(m.id));
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    if (ids.length) {
      for (let i = 0; i < ids.length; i += 1000) {
        const slice = ids.slice(i, i + 1000);
        await gmail.users.messages.batchModify({
          userId: "me",
          requestBody: { ids: slice, addLabelIds: ["TRASH"], removeLabelIds: [] },
        });
      }
    }
    deletedCountBySender[fromEmail] = ids.length;
  }

  return deletedCountBySender;
}

export const GMAIL_SCOPES = SCOPES;