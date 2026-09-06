/**
 * The client side of nestjs-mvc for React: `import { Link, useForm, Head } from 'nestjs-mvc/react'`.
 *
 * nestjs-mvc speaks the Inertia protocol, and this module is Inertia's React
 * adapter, re-exported as it is — components, hooks, the `router`, and every
 * type. There is no separate client to learn and nothing is renamed; what
 * changes is where it comes from. One import path for the whole stack means:
 *
 * - the client version is checked against the server's protocol: the adapter
 *   is a peer dependency of this package, installed next to it by your app;
 * - the generated Vite entries import from here too, so your pages and the
 *   app shell always share one instance (no duplicated React context);
 * - the docs can teach the full-stack model in one place instead of pointing
 *   at another project's reference for half of it.
 *
 * Type augmentation still targets the underlying module — the client reads
 * `InertiaConfig` from `@inertiajs/core`:
 *
 * ```ts
 * declare module '@inertiajs/core' {
 *   interface InertiaConfig { errorValueType: string[] }
 * }
 * ```
 */
export * from '@inertiajs/react'
