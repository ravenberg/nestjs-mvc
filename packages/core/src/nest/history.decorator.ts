import { SetMetadata } from '@nestjs/common'
import { MVC_ENCRYPT_HISTORY_METADATA } from './tokens'

/**
 * Asks the client to encrypt the history entries of the pages a route renders,
 * so sensitive props are not readable from the browser's history after logout.
 * On a controller it covers every handler; a handler can opt out with
 * `@EncryptHistory(false)`. `history.encrypt` on the module sets the default,
 * and `ViewService.encryptHistory()` overrides both for one request.
 *
 * Pair it with `ViewService.clearHistory()` in your logout handler, which tells
 * the client to rotate the key and drop what it stored.
 */
export const EncryptHistory = (enabled = true): MethodDecorator & ClassDecorator =>
  SetMetadata(MVC_ENCRYPT_HISTORY_METADATA, enabled)
