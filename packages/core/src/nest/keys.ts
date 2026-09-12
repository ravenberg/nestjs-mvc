import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { Logger } from '@nestjs/common'

/** Shortest key accepted; `randomBytes(32).toString('base64url')` is 43 characters. */
export const MIN_KEY_LENGTH = 32

/** The command a boot error or warning points at. */
export const GENERATE_KEY_COMMAND = `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`

const MAC_BYTES = 32
const SALT = 'nestjs-mvc'

/**
 * The app's secret keys, and the only thing in the adapter that signs.
 *
 * The first key signs; every key verifies, so a key can be rotated without
 * invalidating what the browser already holds (Laravel's `APP_KEY` plus
 * `APP_PREVIOUS_KEYS`). Each purpose (`flash`, `csrf`, …) signs with its own
 * subkey derived through HKDF, so a value signed for one purpose never
 * verifies for another.
 *
 * Holds nothing but the keys it was given: subkeys are derived on every call
 * (a few microseconds) rather than cached on this process-wide instance.
 */
export class KeyRing {
  private readonly keys: readonly string[]

  constructor(keys: readonly string[]) {
    if (keys.length === 0) throw new Error('[nestjs-mvc] KeyRing needs at least one key.')
    keys.forEach((key, index) => {
      if (key.length < MIN_KEY_LENGTH) {
        throw new Error(
          `[nestjs-mvc] Key ${index} is ${key.length} characters; keys must be at least ${MIN_KEY_LENGTH}. ` +
            `Generate one with: ${GENERATE_KEY_COMMAND}`,
        )
      }
    })
    this.keys = [...keys]
  }

  /** `value` plus its signature, as `value.signature`. The value itself is not hidden. */
  sign(purpose: string, value: string): string {
    return `${value}.${this.mac(this.keys[0], purpose, value).toString('base64url')}`
  }

  /** The value `sign()` was given, if `signed` carries a valid signature for this purpose; else `undefined`. */
  verify(purpose: string, signed: string): string | undefined {
    const dot = signed.lastIndexOf('.')
    if (dot === -1) return undefined
    const value = signed.slice(0, dot)
    const given = Buffer.from(signed.slice(dot + 1), 'base64url')
    if (given.length !== MAC_BYTES) return undefined
    // Every key is tried, the current one first; comparison is constant-time.
    return this.keys.some((key) => timingSafeEqual(given, this.mac(key, purpose, value))) ? value : undefined
  }

  /**
   * A keyed hash of `value` under the current key: equal input gives equal
   * output, and the value cannot be read back or guessed without the key. For
   * comparing, not for verifying — after a key rotation the digest changes.
   */
  digest(purpose: string, value: string): string {
    return this.mac(this.keys[0], purpose, value).toString('base64url')
  }

  private mac(key: string, purpose: string, value: string): Buffer {
    if (!purpose) throw new Error('[nestjs-mvc] A signing purpose is required.')
    const subkey = Buffer.from(hkdfSync('sha256', key, SALT, purpose, MAC_BYTES))
    return createHmac('sha256', subkey).update(value).digest()
  }
}

/** `keys` as given to the module, else `APP_KEY` and the comma-separated `APP_PREVIOUS_KEYS`. */
export function configuredKeys(
  keys: string | readonly (string | undefined)[] | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const given = keys === undefined ? [env.APP_KEY, ...(env.APP_PREVIOUS_KEYS ?? '').split(',')] : [keys].flat()
  return given.map((key) => key?.trim()).filter((key): key is string => !!key)
}

/**
 * The module's `KeyRing`. Without a key, production refuses to boot; any other
 * environment gets a random key for this process, with a warning (outside
 * tests), because anything signed with it dies with the process.
 */
export function createKeyRing(
  keys: string | readonly (string | undefined)[] | undefined,
  env: NodeJS.ProcessEnv = process.env,
): KeyRing {
  const configured = configuredKeys(keys, env)
  if (configured.length > 0) return new KeyRing(configured)

  if (env.NODE_ENV === 'production') {
    throw new Error(
      '[nestjs-mvc] No signing key: set APP_KEY (or MvcModule.forRoot({ keys })) before starting in production. ' +
        `Generate one with: ${GENERATE_KEY_COMMAND}`,
    )
  }
  if (env.NODE_ENV !== 'test') {
    new Logger('MvcKeys').warn(
      'No APP_KEY set: using a random key for this process, so signed cookies (flash) do not survive a restart. ' +
        `Generate one with: ${GENERATE_KEY_COMMAND}`,
    )
  }
  return new KeyRing([randomBytes(32).toString('base64url')])
}
