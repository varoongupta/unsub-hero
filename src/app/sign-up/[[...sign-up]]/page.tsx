"use client"
import { SignUp } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="p-8 flex justify-center">
      <SignUp routing="path" path="/sign-up" />
    </div>
  )
}
