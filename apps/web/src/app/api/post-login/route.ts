import { NextResponse } from "next/server"
import { getAuthContext, ROLE_HOME } from "@/lib/auth-guard"

export async function GET(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.redirect(new URL(ROLE_HOME[ctx.role], request.url))
}