import type { ReactNode } from 'react'
import { PersistentLayout } from '../../../layouts/PersistentLayout'
import { SectionLayout } from '../../../layouts/SectionLayout'

function Nested({ section, renderedAt }: { section: string; renderedAt: string }) {
  return (
    <div className="text-sm">
      <p>
        Section <strong>{section}</strong>, rendered at {new Date(renderedAt).toLocaleTimeString()}.
      </p>
      <p className="mt-2 opacity-80">
        Two persistent layouts, one inside the other: the outer frame (clock, counter) and the inner tab strip.
        Both stay mounted while you switch tabs. The page declares them once:{' '}
        <code className="rounded bg-black/5 px-1">Page.layout = (page) =&gt; &lt;Outer&gt;&lt;Inner&gt;{'{page}'}&lt;/Inner&gt;&lt;/Outer&gt;</code>.
      </p>
    </div>
  )
}

Nested.layout = (page: ReactNode & { props?: { section?: string } }) => (
  <PersistentLayout title="Nested Layouts">
    <SectionLayout current={(page as { props?: { section?: string } }).props?.section}>{page}</SectionLayout>
  </PersistentLayout>
)

export default Nested
