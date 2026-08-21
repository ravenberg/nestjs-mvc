import { useForm } from '@inertiajs/react'
import { Layout } from '../Layout'

interface Props {
  framework: string
  serverTime: string
  messages: string[]
}

export default function Home({ framework, serverTime, messages }: Props) {
  const { data, setData, post, processing, reset } = useForm({ message: '' })

  return (
    <Layout>
      <h1>{framework} × Inertia</h1>
      <p>
        Server-rendered page object, client-side navigation. Server time at render: <code>{serverTime}</code>
      </p>

      <h2>Post a message</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          post('/messages', { onSuccess: () => reset() })
        }}
      >
        <input
          value={data.message}
          onChange={(e) => setData('message', e.target.value)}
          placeholder="Type something…"
        />
        <button type="submit" disabled={processing}>
          Send
        </button>
      </form>

      <ul>
        {messages.map((message, i) => (
          <li key={i}>{message}</li>
        ))}
      </ul>
    </Layout>
  )
}
