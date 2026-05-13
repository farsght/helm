import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET() {
  const { userId } = await auth()
  const dbCheck = await db.execute(sql`SELECT 1 as ok`)
  return Response.json({
    status: "ok",
    auth: userId ? "authenticated" : "unauthenticated",
    db: "connected",
    userId: userId ? userId.slice(0, 8) + "..." : null,
  })
}
