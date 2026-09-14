import { Injectable } from '@nestjs/common'
import { ValidationException } from 'nestjs-mvc'

/** An uploaded image, in the shape each platform's upload handler hands over. */
export interface UploadedImage {
  name: string
  type: string
  size: number
  bytes: Buffer
}

interface StoredUpload extends UploadedImage {
  id: number
  caption: string
  uploadedAt: string
}

const MAX_UPLOADS = 12 // memory storage: keep the gallery bounded
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The File Uploads page's gallery, in memory. Reading the multipart body is
 * the one thing Express and Fastify do differently, so that part lives in each
 * app's `upload.controller.ts`; validating and keeping the image is the same
 * everywhere and lives here.
 */
@Injectable()
export class UploadGallery {
  private readonly uploads: StoredUpload[] = []
  private nextId = 1

  list(): StoredUpload[] {
    return this.uploads
  }

  find(id: number): StoredUpload | undefined {
    return this.uploads.find((upload) => upload.id === id)
  }

  /** Validates like any form (errors go back to the fields) and stores the image. */
  async add(image: UploadedImage | undefined, caption: string | undefined): Promise<StoredUpload> {
    const errors: Record<string, string> = {}
    if (!image) errors.avatar = 'Pick an image first.'
    else if (!image.type.startsWith('image/')) errors.avatar = `Images only; this is ${image.type}.`
    if (!caption?.trim()) errors.caption = 'Give it a caption.'
    if (Object.keys(errors).length > 0) throw new ValidationException(errors)

    await sleep(800) // so the progress bar has something to show
    const upload = { id: this.nextId++, ...image!, caption: caption!.trim(), uploadedAt: new Date().toISOString() }
    this.uploads.unshift(upload)
    this.uploads.splice(MAX_UPLOADS)
    return upload
  }
}
