import { NextResponse } from "next/server";
import { runLeaveDay } from "@/server/leave-day";

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runLeaveDay();
  return NextResponse.json(result);
}
