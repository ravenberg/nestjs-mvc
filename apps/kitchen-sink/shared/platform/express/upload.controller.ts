import { Body, Controller, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ViewService } from 'nestjs-mvc'
import { Public } from '../../server/auth/public.decorator'
import { UploadGallery } from '../../server/features/upload-gallery'

/** What multer hands `@UploadedFile()`; declared here so the app needs no `@types/multer`. */
interface MulterFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

/**
 * The POST of the File Uploads page. Inertia sends a multipart body when the
 * form data holds a File; Nest's `FileInterceptor` (multer, memory storage)
 * makes it `@UploadedFile()` and the text fields land in `@Body()` as usual.
 * `FileInterceptor` exists for Express only: the Fastify apps read the same
 * form with `@fastify/multipart`.
 */
@Public()
@Controller('features/forms')
export class UploadController {
  constructor(
    @Inject(ViewService) private readonly view: ViewService,
    @Inject(UploadGallery) private readonly gallery: UploadGallery,
  ) {}

  @Post('file-uploads')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: MulterFile | undefined, @Body('caption') caption?: string) {
    const image = file && { name: file.originalname, type: file.mimetype, size: file.size, bytes: file.buffer }
    const upload = await this.gallery.add(image, caption)
    return this.view.flash('message', `Uploaded ${upload.name} (${Math.round(upload.size / 1024)} kB).`).back()
  }
}
