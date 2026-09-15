<script setup lang="ts">
import PersistentLayout from '../../../layouts/PersistentLayout.vue'
import SectionLayout from '../../../layouts/SectionLayout.vue'

// Two layouts, outer first. A function of the page props, so the tab strip knows the current section.
defineOptions({
  layout: (props: { section?: string }) => [
    [PersistentLayout, { title: 'Nested Layouts' }],
    [SectionLayout, { current: props.section }],
  ],
})

defineProps<{ section: string; renderedAt: string }>()
</script>

<template>
  <div class="text-sm">
    <p>Section <strong>{{ section }}</strong>, rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.</p>
    <p class="mt-2 opacity-80">
      Two persistent layouts, one inside the other: the outer frame (clock, counter) and the inner tab strip. Both stay mounted while you switch tabs. The page declares them once: <code class="rounded bg-black/5 px-1">defineOptions({ layout: (props) =&gt; [[Outer, { title }], [Inner, { current: props.section }]] })</code>.
    </p>
  </div>
</template>
