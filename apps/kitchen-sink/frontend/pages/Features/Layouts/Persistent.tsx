import type { ReactNode } from 'react'
import { PersistentLayout } from '../../../layouts/PersistentLayout'

function Persistent({ tab, renderedAt }: { tab: string; renderedAt: string }) {
  return (
    <div className="text-sm">
      <p>
        Page <strong>{tab}</strong>, rendered on the server at {new Date(renderedAt).toLocaleTimeString()}.
      </p>
      <p className="mt-2 opacity-80">
        Every page in this section sets <code className="rounded bg-black/5 px-1">Page.layout = (page) =&gt; &lt;PersistentLayout&gt;{'{page}'}&lt;/PersistentLayout&gt;</code>.
        Switch between first, second and third above: the clock keeps counting and "pages shown" goes up, because
        the layout is not part of the page component and React keeps it mounted. Compare with any other page in the
        demo, where the layout is rendered inside the page and remounts on each visit.
      </p>
    </div>
  )
}

Persistent.layout = (page: ReactNode) => <PersistentLayout title="Persistent Layouts">{page}</PersistentLayout>

export default Persistent
