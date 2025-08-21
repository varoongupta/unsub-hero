"use client"
import { SignIn } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <SignIn routing="path" path="/sign-in" />
      </div>
    </div>
  )
}
