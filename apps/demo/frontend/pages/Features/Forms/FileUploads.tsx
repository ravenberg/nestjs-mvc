import { useForm, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Upload {
  id: number
  name: string
  type: string
  size: number
  caption: string
  uploadedAt: string
  url: string
}

export default function FileUploads({ uploads }: { uploads: Upload[] }) {
  const flash = usePage().flash?.message as string | undefined
  const form = useForm<{ avatar: File | null; caption: string }>({ avatar: null, caption: '' })
  const [preview, setPreview] = useState<string | null>(null)

  // A local preview before anything is sent; revoked when the file changes.
  useEffect(() => {
    if (!form.data.avatar) return setPreview(null)
    const url = URL.createObjectURL(form.data.avatar)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [form.data.avatar])

  return (
    <AppLayout title="File Uploads" description="A File in the form data makes the visit multipart; Nest receives it through FileInterceptor">
      {flash && <div className="mb-4 max-w-5xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}

      <div className="grid max-w-5xl gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.post('/features/forms/file-uploads', { onSuccess: () => form.reset(), forceFormData: true })
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          <p className="text-slate-600">
            Put a <code className="rounded bg-slate-100 px-1">File</code> in the data and Inertia sends{' '}
            <code className="rounded bg-slate-100 px-1">multipart/form-data</code>. On the server,{' '}
            <code className="rounded bg-slate-100 px-1">@UseInterceptors(FileInterceptor('avatar'))</code> and{' '}
            <code className="rounded bg-slate-100 px-1">@UploadedFile()</code> — Nest's own tooling — and the text
            fields arrive in <code className="rounded bg-slate-100 px-1">@Body()</code> as usual. The image is kept in
            memory and served back by a plain route.
          </p>

          <label className="mt-4 block">
            <span className="font-medium text-slate-700">Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => form.setData('avatar', e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
            />
            {form.errors.avatar && <span className="mt-1 block text-xs text-red-600">{form.errors.avatar}</span>}
          </label>

          {preview && (
            <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
              <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded object-contain" />
              <p className="mt-1 text-center text-xs text-slate-500">
                Preview, not uploaded yet · {form.data.avatar?.name} · {Math.round((form.data.avatar?.size ?? 0) / 1024)} kB
              </p>
            </div>
          )}

          <label className="mt-3 block">
            <span className="font-medium text-slate-700">Caption</span>
            <input
              value={form.data.caption}
              onChange={(e) => form.setData('caption', e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${form.errors.caption ? 'border-red-400' : 'border-slate-300'}`}
            />
            {form.errors.caption && <span className="mt-1 block text-xs text-red-600">{form.errors.caption}</span>}
          </label>

          {form.progress && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded bg-slate-100">
                <div className="h-2 bg-blue-500 transition-all" style={{ width: `${form.progress.percentage ?? 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{form.progress.percentage}% uploaded</p>
            </div>
          )}

          <button
            type="submit"
            disabled={form.processing}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {form.processing ? 'Uploading…' : 'Upload'}
          </button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Gallery</h2>
          <p className="text-xs text-slate-500">Served from memory by GET /file-uploads/:id/image; the last twelve are kept.</p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {uploads.map((u) => (
              <li key={u.id} className="overflow-hidden rounded-lg border border-slate-200">
                <img src={u.url} alt={u.caption} className="aspect-square w-full bg-slate-50 object-cover" loading="lazy" />
                <div className="p-2">
                  <p className="truncate font-medium" title={u.caption}>
                    {u.caption}
                  </p>
                  <p className="truncate text-xs text-slate-500" title={u.name}>
                    {u.type.replace('image/', '')} · {Math.round(u.size / 1024)} kB · {new Date(u.uploadedAt).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            ))}
            {uploads.length === 0 && <li className="col-span-full py-2 text-slate-500">Nothing uploaded yet.</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
