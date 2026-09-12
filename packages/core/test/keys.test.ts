import { Controller, Get, Inject } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KeyRing, MIN_KEY_LENGTH, MVC_KEYS, MvcModule, createKeyRing } from '../src/index'
import { configuredKeys } from '../src/nest/keys'

const current = 'current-key-'.padEnd(43, 'c')
const previous = 'previous-key-'.padEnd(43, 'p')

describe('KeyRing', () => {
  const ring = new KeyRing([current])

  it('round-trips a value, dots and all', () => {
    const value = '{"flash":{"message":"Saved. Really."}}'
    const signed = ring.sign('flash', value)
    expect(signed.startsWith(`${value}.`)).toBe(true)
    expect(ring.verify('flash', signed)).toBe(value)
    expect(ring.verify('flash', ring.sign('flash', ''))).toBe('')
  })

  it('rejects a tampered value, a tampered or truncated signature, and garbage', () => {
    const signed = ring.sign('flash', 'user:1')
    const mac = signed.slice(signed.lastIndexOf('.') + 1)

    expect(ring.verify('flash', `user:2.${mac}`)).toBeUndefined()
    expect(ring.verify('flash', `user:1.${mac.slice(0, -1)}A`)).toBeUndefined()
    expect(ring.verify('flash', signed.slice(0, -2))).toBeUndefined()
    expect(ring.verify('flash', 'user:1')).toBeUndefined()
    expect(ring.verify('flash', '')).toBeUndefined()
    expect(ring.verify('flash', '.')).toBeUndefined()
  })

  it('never verifies a value signed for another purpose', () => {
    expect(ring.verify('csrf', ring.sign('flash', 'user:1'))).toBeUndefined()
  })

  it('signs with the first key and verifies with all of them (rotation)', () => {
    const before = new KeyRing([previous]).sign('flash', 'user:1')
    const rotated = new KeyRing([current, previous])

    expect(rotated.verify('flash', before)).toBe('user:1')
    expect(rotated.sign('flash', 'user:1')).toBe(ring.sign('flash', 'user:1'))
    expect(ring.verify('flash', before)).toBeUndefined() // old key dropped: its cookies die
  })

  it('refuses short keys and an empty ring, without printing the key', () => {
    expect(() => new KeyRing([])).toThrow(/at least one key/)
    const short = 'x'.repeat(MIN_KEY_LENGTH - 1)
    expect(() => new KeyRing([current, short])).toThrow(/Key 1 is 31 characters/)

    const message = (() => {
      try {
        new KeyRing([short])
        return ''
      } catch (error) {
        return (error as Error).message
      }
    })()
    expect(message).toMatch(/at least 32/)
    expect(message).not.toContain(short)
  })

  it('keeps nothing per value: equal input, equal output, on any instance', () => {
    expect(new KeyRing([current]).sign('flash', 'a')).toBe(ring.sign('flash', 'a'))
    expect(Object.keys(ring)).toEqual(['keys'])
  })
})

describe('where the keys come from', () => {
  it('uses the module option, skipping undefined entries', () => {
    expect(configuredKeys([current, undefined, ' ', previous], {})).toEqual([current, previous])
    expect(configuredKeys(current, { APP_KEY: previous })).toEqual([current])
  })

  it('falls back to APP_KEY and APP_PREVIOUS_KEYS', () => {
    expect(configuredKeys(undefined, { APP_KEY: current, APP_PREVIOUS_KEYS: ` ${previous}, ` })).toEqual([current, previous])
    expect(configuredKeys(undefined, {})).toEqual([])
  })

  it('refuses to start in production without a key', () => {
    expect(() => createKeyRing(undefined, { NODE_ENV: 'production' })).toThrow(/set APP_KEY/)
    expect(createKeyRing(undefined, { NODE_ENV: 'production', APP_KEY: current })).toBeInstanceOf(KeyRing)
  })

  it('uses a random key per process elsewhere', () => {
    const a = createKeyRing(undefined, { NODE_ENV: 'test' })
    const b = createKeyRing(undefined, { NODE_ENV: 'test' })
    expect(a.verify('flash', a.sign('flash', 'x'))).toBe('x')
    expect(b.verify('flash', a.sign('flash', 'x'))).toBeUndefined()
  })
})

describe('MvcModule and keys', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
    vi.restoreAllMocks()
  })

  @Controller()
  class KeysController {
    constructor(@Inject(MVC_KEYS) private readonly keys: KeyRing) {}

    @Get('sign')
    sign() {
      return { signed: this.keys.sign('invite', 'team:7') }
    }
  }

  it('provides the KeyRing built from `keys`', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ keys: [current, previous] })],
      controllers: [KeysController],
    }).compile()
    const app = moduleRef.createNestApplication({ logger: false })
    await app.init()

    const res = await request(app.getHttpServer()).get('/sign')
    expect(new KeyRing([current]).verify('invite', res.body.signed)).toBe('team:7')
    await app.close()
  })

  it('fails to boot in production when no key is configured', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.APP_KEY
    delete process.env.APP_PREVIOUS_KEYS

    await expect(
      Test.createTestingModule({ imports: [MvcModule.forRoot({})] }).compile(),
    ).rejects.toThrow(/No signing key/)
  })
})
