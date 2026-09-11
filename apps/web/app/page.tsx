"use client"

import { Button } from "@workspace/ui/components/button"
import Link from "next/link"
export default function ToastTypes() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/login">
        <Button size={"sm"}>
          Login
        </Button>
      </Link>
    </div>
  )
}
