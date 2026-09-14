import type { Multipart } from '@fastify/multipart'
import { Controller, Inject, PayloadTooLargeException, Post, Req } from '@nestjs/common'
import { Public, UploadGallery, type UploadedImage } from 'kitchen-sink/server'
import { ViewService } from 'nestjs-mvc'

/** The part of Fastify's request that `@fastify/multipart` adds (registered in main.ts). */
interface MultipartRequest {
  parts(): AsyncIterableIterator<Multipart>
}

/**
 * The POST of the File Uploads page. Inertia sends a multipart body when the
 * form data holds a File. Nest's `FileInterceptor` is Express only, so on
 * Fastify the handler reads the body itself: `req.parts()` yields the file and
 * the text fields in the order the browser sent them.
 */
@Public()
@Controller('features/forms')
export class UploadController {
  constructor(
    @Inject(ViewService) private readonly view: ViewService,
    @Inject(UploadGallery) private readonly gallery: UploadGallery,
  ) {}

  @Post('file-uploads')
  async upload(@Req() req: MultipartRequest) {
    let image: UploadedImage | undefined
    let caption: string | undefined
    try {
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          // Every file has to be read to the end, or the request never finishes.
          const bytes = await part.toBuffer()
          if (part.fieldname === 'avatar') image = { name: part.filename, type: part.mimetype, size: bytes.length, bytes }
        } else if (part.fieldname === 'caption') {
          caption = String(part.value)
        }
      }
    } catch (error) {
      // What FileInterceptor answers on Express; the plugin's own error would be a 500 in Nest.
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') throw new PayloadTooLargeException('File too large')
      throw error
    }

    const upload = await this.gallery.add(image, caption)
    return this.view.flash('message', `Uploaded ${upload.name} (${Math.round(upload.size / 1024)} kB).`).back()
  }
}
