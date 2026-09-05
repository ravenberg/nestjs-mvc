/**
 * Thrown by `ViewService.redirect()`, `back()` and `location()` to end the
 * request with a redirect. A request-scoped service only ever sees the request,
 * never the platform's response object, so it cannot write the redirect itself;
 * the `MvcExceptionFilter` catches this and answers through Nest's HTTP adapter,
 * which knows how to redirect on Express and Fastify alike. Code after the call
 * does not run — the same way `throw new NotFoundException()` ends a handler.
 */
export class MvcRedirect extends Error {
  constructor(
    readonly url: string,
    /** Omit to follow the protocol: 303 after PUT/PATCH/DELETE, 302 otherwise. */
    readonly status?: number,
    /** An external (non-Inertia) destination: answered with 409 + X-Inertia-Location on Inertia visits. */
    readonly external = false,
  ) {
    super(`Redirect to ${url}`)
    this.name = 'MvcRedirect'
  }
}
