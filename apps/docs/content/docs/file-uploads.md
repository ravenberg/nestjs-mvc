---
title: File uploads
---

An upload is a normal form that happens to have a file in it, and NestJS receives it the way it always does. {% .lead %}

## The page

Put a `File` in `useForm`. As soon as there's a file in the data, the form is sent as `multipart/form-data`.

```tsx
import { useForm } from 'nestjs-mvc/react'

export default function Avatar() {
  const form = useForm<{ avatar: File | null }>({ avatar: null })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post('/profile/avatar')
  }

  return (
    <form onSubmit={submit}>
      <input type="file" onChange={(e) => form.setData('avatar', e.target.files?.[0] ?? null)} />
      {form.errors.avatar && <p>{form.errors.avatar}</p>}

      {form.progress && <progress value={form.progress.percentage} max="100" />}

      <button disabled={form.processing}>Upload</button>
    </form>
  )
}
```

`form.progress` tells you how much has been uploaded, so you can show a progress bar for large files.

## The controller

Use NestJS's `FileInterceptor`, the same way the NestJS docs do:

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ValidationException, ViewService } from 'nestjs-mvc'

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly avatars: AvatarService,
    private readonly view: ViewService,
  ) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async upload(@UploadedFile() avatar?: Express.Multer.File) {
    if (!avatar) {
      throw new ValidationException({ avatar: 'Pick a file first.' })
    }
    if (avatar.size > 2 * 1024 * 1024) {
      throw new ValidationException({ avatar: 'The file can be 2 MB at most.' })
    }

    await this.avatars.save(avatar)
    return this.view.flash('message', 'Avatar updated.').back()
  }
}
```

For the `Express.Multer.File` type, install `@types/multer` as a dev dependency.

`FileInterceptor` only works on Express. If you're on Fastify, see [Using Fastify](/docs/fastify#file-uploads).

## Why ValidationException

`ValidationException` puts the message on the `avatar` field, so the form shows it right next to the input. NestJS's own file pipes throw a general error without a field, so it wouldn't show up in your form.
