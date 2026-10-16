import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, cookieOptions } from "@/lib/session";

export async function GET() {
  const jar = await cookies();
  jar.set(COOKIE, "", cookieOptions(0));
  redirect("/");
}
