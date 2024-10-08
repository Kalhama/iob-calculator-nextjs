import { db } from '@/db'
import { parseCommaFloat } from '@/lib/parse-comma-float'
import { glucose, userTable } from '@/schema'
import { subHours } from 'date-fns'
import { and, eq, gte, isNotNull } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const postGlucoseSchema = z.array(
  z.object({
    value: z.preprocess((v) => parseCommaFloat(v), z.number().gt(0).lt(50)),
    timestamp: z
      .string()
      .datetime()
      .transform((d) => new Date(d)),
    device: z.string(),
  })
)

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const API_KEY = searchParams.get('API_KEY')

  if (!API_KEY) {
    return Response.json(
      { error: 'Missing get param API_KEY' },
      { status: 400 }
    )
  }

  const user = (
    await db
      .select()
      .from(userTable)
      .where(and(isNotNull(userTable.apikey), eq(userTable.apikey, API_KEY)))
      .limit(1)
  )[0]

  if (!user) {
    return Response.json({ error: 'not authorized' }, { status: 401 })
  }

  const req = await request.json()

  const { success, data, error } = postGlucoseSchema.safeParse(req)

  if (!success) {
    return Response.json({ error: error.flatten() }, { status: 400 })
  }

  for (const bg of data) {
    const existing = (
      await db
        .select()
        .from(glucose)
        .where(
          and(
            eq(glucose.userId, user.id),
            eq(glucose.timestamp, bg.timestamp),
            eq(glucose.device, bg.device)
          )
        )
        .limit(1)
    )[0]

    if (existing) {
      await db
        .update(glucose)
        .set({
          value: bg.value,
        })
        .where(eq(glucose.id, existing.id))
    } else {
      await db.insert(glucose).values({
        value: bg.value,
        timestamp: bg.timestamp,
        userId: user.id,
        device: bg.device,
      })
    }
  }

  return Response.json({ status: 'ok' })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const API_KEY = searchParams.get('API_KEY')

  if (!API_KEY) {
    return Response.json(
      { error: 'Missing get param API_KEY' },
      { status: 400 }
    )
  }

  const user = (
    await db
      .select()
      .from(userTable)
      .where(and(isNotNull(userTable.apikey), eq(userTable.apikey, API_KEY)))
      .limit(1)
  )[0]

  if (!user) {
    return Response.json({ error: 'not authorized' }, { status: 401 })
  }

  const data = await db
    .select()
    .from(glucose)
    .where(
      and(
        eq(glucose.userId, user.id),
        gte(glucose.timestamp, subHours(new Date(), 48))
      )
    )

  return Response.json(data)
}
