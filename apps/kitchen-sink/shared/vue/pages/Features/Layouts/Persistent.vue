<script setup lang="ts">
import PersistentLayout from '../../../layouts/PersistentLayout.vue'

// A layout with props: a [component, props] tuple.
defineOptions({ layout: [PersistentLayout, { title: 'Persistent Layouts' }] })

defineProps<{ tab: string; renderedAt: string }>()
</script>

<template>
  <div class="text-sm">
    <p>Page <strong>{{ tab }}</strong>, rendered on the server at {{ new Date(renderedAt).toLocaleTimeString() }}.</p>
    <p class="mt-2 opacity-80">
      Every page in this section sets <code class="rounded bg-black/5 px-1">defineOptions({ layout: [PersistentLayout, { title }] })</code>. Switch between first, second and third above: the clock keeps counting and "pages shown" goes up, because the layout is not part of the page component and Vue keeps it mounted. Compare with any other page in the demo, where the layout is rendered inside the page and remounts on each visit.
    </p>
  </div>
</template>
