<script setup lang="ts">
import { Bell, LogOut } from 'lucide-vue-next'
import { Deferred, Link, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import { navigation } from '../../navigation'
import NavGroupItem from './NavGroupItem.vue'
import { icons, isActive } from './navigation'

const page = usePage<{
  auth?: {
    user?: { name: string; email: string } | null
    notifications?: { id: number; body: string }[]
  }
}>()

const user = computed(() => page.props.auth?.user)
const notifications = computed(() => page.props.auth?.notifications)
const initials = computed(() =>
  (user.value?.name ?? '')
    .split(' ')
    .map((part) => part[0])
    .join(''),
)
</script>

<template>
  <aside class="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
    <div class="flex items-center gap-2 px-5 py-5">
      <span class="grid size-8 place-items-center rounded-lg bg-blue-600 font-bold text-white">N</span>
      <span class="font-semibold text-slate-900">NestJS MVC</span>

      <!-- Nested deferred prop: announced as `auth.notifications` and fetched
           after the first paint. Proves dot-notation works end to end. -->
      <Deferred data="auth.notifications">
        <template #fallback>
          <span class="ml-auto size-4 animate-pulse rounded-full bg-slate-200" />
        </template>
        <span class="ml-auto flex items-center gap-1 text-xs text-slate-500" :title="`${notifications?.length ?? 0} recent notes by you`">
          <Bell class="size-4" />
          {{ notifications?.length ?? 0 }}
        </span>
      </Deferred>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-4">
      <div v-for="section in navigation" :key="section.label" class="mb-6">
        <p class="px-3 pb-2 text-xs font-medium tracking-wide text-slate-500">{{ section.label }}</p>
        <ul class="space-y-0.5">
          <template v-for="group in section.groups" :key="group.label">
            <li v-if="group.href">
              <Link
                :href="group.href"
                :class="[
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                  isActive(page.url, group.href) ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700 hover:bg-slate-100',
                ]"
              >
                <component
                  :is="icons[group.icon]"
                  :class="['size-4 shrink-0', isActive(page.url, group.href) ? 'text-blue-600' : 'text-slate-500']"
                />
                {{ group.label }}
              </Link>
            </li>
            <NavGroupItem v-else :group="group" :current-url="page.url" />
          </template>
        </ul>
      </div>
    </nav>

    <div v-if="user" class="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
      <span class="grid size-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">{{ initials }}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-slate-900">{{ user.name }}</p>
        <p class="truncate text-xs text-slate-500">{{ user.email }}</p>
      </div>
      <!-- A POST, so a link from another site cannot log you out. -->
      <Link
        href="/logout"
        method="post"
        as="button"
        title="Log out"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <LogOut class="size-4" />
        <span class="sr-only">Log out</span>
      </Link>
    </div>
    <div v-else class="flex gap-2 border-t border-slate-200 px-5 py-4 text-sm">
      <Link href="/login" class="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700">Log in</Link>
      <Link href="/register" class="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">Register</Link>
    </div>
  </aside>
</template>
