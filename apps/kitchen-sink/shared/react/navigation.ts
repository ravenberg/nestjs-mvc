import {
  Boxes,
  Building2,
  CircleAlert,
  Contact,
  LayoutDashboard,
  Layers,
  Navigation,
  Radio,
  Rss,
  SquarePen,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  /** Omitted while the page has not been built yet; renders as disabled. */
  href?: string
}

export interface NavGroup {
  label: string
  icon: LucideIcon
  href?: string
  items?: NavItem[]
}

export interface NavSection {
  label: string
  groups: NavGroup[]
}

/**
 * Drives the sidebar. Items without an `href` are part of the roadmap and render
 * muted, so the demo shows what is coming without offering dead links.
 */
export const navigation: NavSection[] = [
  {
    label: 'CRM demo',
    groups: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Organizations', icon: Building2, href: '/organizations' },
      { label: 'Contacts', icon: Contact, href: '/contacts' },
    ],
  },
  {
    label: 'Kitchen Sink',
    groups: [
      {
        label: 'Forms',
        icon: SquarePen,
        items: [
          { label: 'Validation', href: '/features/forms/validation' },
          { label: 'useForm', href: '/features/forms/use-form' },
          { label: 'Form Component', href: '/features/forms/form-component' },
          { label: 'File Uploads', href: '/features/forms/file-uploads' },
          { label: 'Precognition', href: '/features/forms/precognition' },
          { label: 'Optimistic Updates', href: '/features/forms/optimistic-updates' },
          { label: 'Dotted Keys', href: '/features/forms/dotted-keys' },
        ],
      },
      {
        label: 'Navigation',
        icon: Navigation,
        items: [
          { label: 'Links & Methods', href: '/features/navigation/links' },
          { label: 'Preserve State', href: '/features/navigation/preserve-state' },
          { label: 'Preserve Scroll', href: '/features/navigation/preserve-scroll' },
          { label: 'History Management', href: '/features/navigation/history' },
          { label: 'Redirects', href: '/features/navigation/redirects' },
          { label: 'URL Fragments', href: '/features/navigation/fragments' },
        ],
      },
      {
        label: 'Data Loading',
        icon: Boxes,
        items: [
          { label: 'Deferred Props', href: '/features/data-loading/deferred-props' },
          { label: 'Partial Reloads', href: '/features/data-loading/partial-reloads' },
          { label: 'Infinite Scroll', href: '/features/data-loading/infinite-scroll?page=3' },
          { label: 'When Visible', href: '/features/data-loading/when-visible' },
          { label: 'Polling', href: '/features/data-loading/polling' },
          { label: 'Prop Merging', href: '/features/data-loading/prop-merging' },
          { label: 'Once Props', href: '/features/data-loading/once-props' },
        ],
      },
      {
        label: 'Prefetching',
        icon: Zap,
        items: [
          { label: 'Link Prefetch', href: '/features/prefetching/links' },
          { label: 'Stale While Revalidate', href: '/features/prefetching/swr' },
          { label: 'Cache Management', href: '/features/prefetching/cache' },
        ],
      },
      {
        label: 'State Management',
        icon: Layers,
        items: [
          { label: 'Remember', href: '/features/state/remember' },
          { label: 'Flash Data', href: '/features/state/flash' },
          { label: 'Shared Props', href: '/features/state/shared-props' },
        ],
      },
      {
        label: 'Layouts & Head',
        icon: Rss,
        items: [
          { label: 'Persistent Layouts', href: '/features/layouts/persistent/first' },
          { label: 'Nested Layouts', href: '/features/layouts/nested/overview' },
          { label: 'Head', href: '/features/layouts/head/monolith' },
          { label: 'Layout Props', href: '/features/layouts/props/light' },
        ],
      },
      {
        label: 'Events & Lifecycle',
        icon: Radio,
        items: [
          { label: 'Global Events', href: '/features/events/global' },
          { label: 'Visit Callbacks', href: '/features/events/callbacks' },
          { label: 'Progress', href: '/features/events/progress' },
        ],
      },
      {
        label: 'Error Handling',
        icon: CircleAlert,
        items: [{ label: 'HTTP Exceptions', href: '/features/errors/http' }, { label: 'Network Errors', href: '/features/errors/network' }],
      },
      { label: 'HTTP', icon: Wifi, items: [{ label: 'useHttp', href: '/features/http/use-http' }] },
    ],
  },
]
