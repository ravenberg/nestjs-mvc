import { Deferred } from '@inertiajs/react'
import { Layout } from '../Layout'

interface User {
  id: number
  name: string
}

export default function Users({ users }: { users?: User[] }) {
  return (
    <Layout>
      <h1>Users</h1>
      <p>
        This list is a <code>defer()</code> prop: the first response renders instantly and the client fetches the data
        right after.
      </p>
      <Deferred data="users" fallback={<p>Loading users…</p>}>
        <ul>
          {users?.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </Deferred>
    </Layout>
  )
}
