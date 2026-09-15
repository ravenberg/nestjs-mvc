/**
 * The client side of nestjs-mvc for Vue: `import { Link, useForm, Head } from 'nestjs-mvc/vue'`.
 *
 * nestjs-mvc speaks the Inertia protocol, and this module is Inertia's Vue 3
 * adapter, re-exported as it is: components, composables, the `router`, and
 * every type. Nothing is renamed; what changes is where it comes from. One
 * import path for the whole stack means:
 *
 * - the client version is checked against the server's protocol: the adapter
 *   is a peer dependency of this package, installed next to it by your app;
 * - the generated Vite entries import from here too, so your pages and the
 *   app shell always share one instance (one Inertia plugin, one page store);
 * - the docs can teach the full-stack model in one place.
 *
 * Type augmentation still targets the underlying module; the client reads
 * `InertiaConfig` from `@inertiajs/core`.
 */
export * from '@inertiajs/vue3'
