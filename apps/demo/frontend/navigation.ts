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
          { label: 'useForm' },
          { label: 'Form Component' },
          { label: 'File Uploads' },
          { label: 'Precognition' },
          { label: 'Optimistic Updates' },
          { label: 'Dotted Keys', href: '/features/forms/dotted-keys' },
        ],
      },
      {
        label: 'Navigation',
        icon: Navigation,
        items: [
          { label: 'Links & Methods' },
          { label: 'Preserve State' },
          { label: 'Preserve Scroll' },
          { label: 'History Management' },
          { label: 'Redirects' },
          { label: 'URL Fragments' },
        ],
      },
      {
        label: 'Data Loading',
        icon: Boxes,
        items: [
          { label: 'Deferred Props' },
          { label: 'Partial Reloads' },
          { label: 'Infinite Scroll', href: '/features/data-loading/infinite-scroll?page=3' },
          { label: 'When Visible' },
          { label: 'Polling' },
          { label: 'Prop Merging' },
          { label: 'Once Props', href: '/features/data-loading/once-props' },
        ],
      },
      {
        label: 'Prefetching',
        icon: Zap,
        items: [
          { label: 'Link Prefetch' },
          { label: 'Stale While Revalidate' },
          { label: 'Cache Management' },
        ],
      },
      {
        label: 'State Management',
        icon: Layers,
        items: [{ label: 'Remember' }, { label: 'Flash Data' }, { label: 'Shared Props' }],
      },
      {
        label: 'Layouts & Head',
        icon: Rss,
        items: [
          { label: 'Persistent Layouts' },
          { label: 'Nested Layouts' },
          { label: 'Head' },
          { label: 'Layout Props' },
        ],
      },
      {
        label: 'Events & Lifecycle',
        icon: Radio,
        items: [{ label: 'Global Events' }, { label: 'Visit Callbacks' }, { label: 'Progress' }],
      },
      {
        label: 'Error Handling',
        icon: CircleAlert,
        items: [{ label: 'HTTP Exceptions', href: '/features/errors/http' }, { label: 'Network Errors' }],
      },
      { label: 'HTTP', icon: Wifi, items: [{ label: 'useHttp' }] },
    ],
  },
]
