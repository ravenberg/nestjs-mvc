import {
  Boxes,
  Building2,
  CircleAlert,
  Contact,
  Layers,
  LayoutDashboard,
  Navigation,
  Radio,
  Rss,
  SquarePen,
  Wifi,
  Zap,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type { NavIcon } from '../../navigation'

/** The shared navigation names its icons; this is where they become Vue components. */
export const icons: Record<NavIcon, Component> = {
  Boxes,
  Building2,
  CircleAlert,
  Contact,
  Layers,
  LayoutDashboard,
  Navigation,
  Radio,
  Rss,
  SquarePen,
  Wifi,
  Zap,
}

export function isActive(currentUrl: string, href?: string): boolean {
  if (!href) return false
  return currentUrl === href || currentUrl.startsWith(`${href}/`)
}
