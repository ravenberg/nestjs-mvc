import { Controller, Get, HttpException, Param } from '@nestjs/common'
import { CsrfTokenMismatchException, View } from 'nestjs-mvc'
import { Public } from '../auth/public.decorator'

const REASONS: Record<number, string> = {
  403: 'You are not allowed to see this.',
  404: 'There is nothing here.',
  419: 'A stale CSRF token: back here, "page expired".',
  429: 'Slow down: too many requests.',
  500: 'Something broke on our side.',
  503: 'We are down for maintenance.',
}

/**
 * Error Handling → HTTP Exceptions. Each link throws a real exception; the
 * `errorPages` callback in `app.module.ts` decides which of them become the
 * `Errors/Show` page (rendered with the error's status code), which redirect
 * back with a message (429), and nestjs-mvc sends a CSRF 419 back by itself.
 */
@Public()
@Controller('features/errors')
export class ErrorsController {
  @Get('http')
  @View('Features/Errors/Http')
  index() {
    return { statuses: Object.entries(REASONS).map(([status, reason]) => ({ status: Number(status), reason })) }
  }

  @Get('http/:status')
  throwIt(@Param('status') status: string) {
    const code = Number(status)
    if (code === 500) throw new Error('Simulated crash')
    // The exception the CSRF guard throws; nestjs-mvc answers it on an Inertia visit by itself.
    if (code === 419) throw new CsrfTokenMismatchException()
    throw new HttpException(REASONS[code] ?? `Status ${code}`, code)
  }
}
