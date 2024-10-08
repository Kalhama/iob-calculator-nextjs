import { inuslin_on_board } from '@/server/services/iob'
import { z } from 'zod'

import { RouteProps } from './RouteProps'

export const ZGetInsulinOnBoard = z.object({
  start: z.date(),
  end: z.date(),
})

export const getInsulinOnBoard = async ({
  ctx: { user },
  input: { start, end },
}: RouteProps<z.infer<typeof ZGetInsulinOnBoard>>) => {
  const r = await inuslin_on_board(user.id, start, end)
  return r.toRecords()
}
