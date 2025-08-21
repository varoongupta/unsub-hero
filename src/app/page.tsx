import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-3xl font-semibold">Unsub Hero</h1>
      <p className="text-neutral-500">Bulk unsubscribe and tidy your inbox</p>
      <div className="flex gap-4">
        <Link href="/sign-in" className="px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors">
          Sign in
        </Link>
        <Link href="/dashboard" className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
          Go to Dashboard
        </Link>
      </div>
      <p className="text-sm text-gray-400 mt-4">
        Click &quot;Sign in&quot; to authenticate with Clerk, then connect your Gmail account
      </p>
    </main>
  );
}
