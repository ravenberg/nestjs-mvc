import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ValidationException, View, ViewService } from 'nestjs-mvc'
import { z } from 'zod'

/** What multer hands `@UploadedFile()`; declared here so the demo needs no `@types/multer`. */
interface UploadedImage {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── in-memory state for the kitchen sink; a real app has a database ──────────
const messages: { id: number; author: string; body: string; sentAt: string }[] = []
const subscribers: { id: number; name: string; email: string; plan: string; subscribedAt: string }[] = []
const uploads: { id: number; name: string; type: string; size: number; caption: string; uploadedAt: string; bytes: Buffer }[] = []
const MAX_UPLOADS = 12 // memory storage: keep the gallery bounded
const registrations: { id: number; name: string; email: string; registeredAt: string }[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', registeredAt: new Date().toISOString() },
]
const todos: { id: number; title: string; done: boolean }[] = [
  { id: 1, title: 'Read the Inertia v3 protocol page', done: true },
  { id: 2, title: 'Port the kitchen sink', done: false },
]
let nextId = 100

const MessageSchema = z.object({
  author: z.string().trim().min(2, 'Who is writing? At least 2 characters.'),
  body: z.string().trim().min(5, 'Say a little more: at least 5 characters.').max(200, 'Keep it under 200 characters.'),
})

const SubscribeSchema = z.object({
  name: z.string().trim().min(2, 'A name of at least 2 characters.'),
  email: z.email('That is not an email address.'),
  plan: z.enum(['free', 'team', 'enterprise'], { message: 'Pick one of the plans.' }),
  terms: z.coerce.boolean().refine((v) => v, 'You have to accept the terms.'),
})

// Precognition runs this schema without the handler, so a rule that needs the
// database has to live *in* the schema: Zod's async refine keeps it there.
const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'A name of at least 2 characters.'),
  email: z
    .email('That is not an email address.')
    .refine(async (email) => !registrations.some((r) => r.email.toLowerCase() === email.toLowerCase()), {
      message: 'That email is already registered.',
    }),
  password: z.string().min(8, 'At least 8 characters.'),
})

const TodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'A todo needs at least 3 characters.')
    .refine((t) => t.toLowerCase() !== 'fail', { message: 'The server rejected this one on purpose.' }),
})

/**
 * Forms: useForm, the Form component, file uploads, precognition and
 * optimistic updates. Every POST validates with a Zod schema through
 * `@Body({ schema })`, so an invalid submission takes the redirect-back flow
 * and a valid one flashes and redirects back — the same two paths for every
 * form, whichever client-side helper drives it.
 */
@Controller('features/forms')
export class FormsController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  // ── useForm ──────────────────────────────────────────────────────────────

  @Get('use-form')
  @View('Features/Forms/UseForm')
  useForm() {
    return { messages }
  }

  @Post('use-form/messages')
  async storeMessage(@Body({ schema: MessageSchema }) body: z.infer<typeof MessageSchema>) {
    await sleep(600) // so `processing` is visible
    messages.unshift({ id: nextId++, ...body, sentAt: new Date().toISOString() })
    return this.view.flash('message', `Thanks, ${body.author}.`).back()
  }

  // ── <Form> component ─────────────────────────────────────────────────────

  @Get('form-component')
  @View('Features/Forms/FormComponent')
  formComponent() {
    return { subscribers }
  }

  @Post('form-component/subscribe')
  subscribe(@Body({ schema: SubscribeSchema }) body: z.infer<typeof SubscribeSchema>) {
    subscribers.unshift({ id: nextId++, name: body.name, email: body.email, plan: body.plan, subscribedAt: new Date().toISOString() })
    return this.view.flash('message', `${body.name} is on the ${body.plan} plan.`).back()
  }

  // ── file uploads ─────────────────────────────────────────────────────────

  @Get('file-uploads')
  @View('Features/Forms/FileUploads')
  fileUploads() {
    // The bytes stay on the server; the page gets a URL per image.
    return {
      uploads: uploads.map(({ bytes: _bytes, ...upload }) => ({ ...upload, url: `/features/forms/file-uploads/${upload.id}/image` })),
    }
  }

  /** Serves an uploaded image from memory — a plain Nest route, nothing Inertia about it. */
  @Get('file-uploads/:id/image')
  image(@Param('id') id: string) {
    const upload = uploads.find((u) => u.id === Number(id))
    if (!upload) throw new NotFoundException()
    return new StreamableFile(upload.bytes, { type: upload.type, length: upload.size })
  }

  /**
   * Inertia sends a multipart body when the form data holds a File. Nest's
   * `FileInterceptor` (multer, memory storage) makes it `@UploadedFile()`; the
   * text fields land in `@Body()` as usual. Express-only, like multer itself.
   */
  @Post('file-uploads')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async upload(@UploadedFile() avatar: UploadedImage | undefined, @Body('caption') caption?: string) {
    const errors: Record<string, string> = {}
    if (!avatar) errors.avatar = 'Pick an image first.'
    else if (!avatar.mimetype.startsWith('image/')) errors.avatar = `Images only; this is ${avatar.mimetype}.`
    if (!caption?.trim()) errors.caption = 'Give it a caption.'
    if (Object.keys(errors).length > 0) throw new ValidationException(errors)

    await sleep(800) // so the progress bar has something to show
    uploads.unshift({
      id: nextId++,
      name: avatar!.originalname,
      type: avatar!.mimetype,
      size: avatar!.size,
      caption: caption!.trim(),
      uploadedAt: new Date().toISOString(),
      bytes: avatar!.buffer,
    })
    uploads.splice(MAX_UPLOADS)
    return this.view.flash('message', `Uploaded ${avatar!.originalname} (${Math.round(avatar!.size / 1024)} kB).`).back()
  }

  // ── precognition ─────────────────────────────────────────────────────────

  @Get('precognition')
  @View('Features/Forms/Precognition')
  precognition() {
    return { registrations: registrations.map(({ id, name, email, registeredAt }) => ({ id, name, email, registeredAt })) }
  }

  @Post('precognition/register')
  register(@Body({ schema: RegisterSchema }) body: z.infer<typeof RegisterSchema>) {
    registrations.unshift({ id: nextId++, name: body.name, email: body.email, registeredAt: new Date().toISOString() })
    return this.view.flash('message', `Welcome, ${body.name}.`).back()
  }

  // ── optimistic updates ───────────────────────────────────────────────────

  @Get('optimistic-updates')
  @View('Features/Forms/OptimisticUpdates')
  optimistic() {
    return { todos }
  }

  @Post('optimistic-updates/todos')
  async addTodo(@Body({ schema: TodoSchema }) body: z.infer<typeof TodoSchema>) {
    await sleep(1200) // the optimistic item is on screen this long before the real one replaces it
    todos.push({ id: nextId++, title: body.title, done: false })
    return this.view.back()
  }

  @Patch('optimistic-updates/todos/:id')
  async toggleTodo(@Param('id') id: string) {
    await sleep(1200)
    const todo = todos.find((t) => t.id === Number(id))
    if (todo) todo.done = !todo.done
    return this.view.back()
  }
}
