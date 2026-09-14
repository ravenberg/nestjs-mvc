---
title: File uploads
---

Uploading a file is a normal form with a file in it. NestJS receives it the way it always does. {% .lead %}

## The page

Put a `File` in `useForm`. When a file is present, the form is sent as `multipart/form-data` by itself.

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

`form.progress` tells you how much is uploaded, so a large file shows a progress bar.

## The controller

Use NestJS's `FileInterceptor`, exactly as in the NestJS docs:

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

## Why ValidationException

`ValidationException` puts the message on the `avatar` field, so the form shows it next to the input. NestJS's own file pipes throw a general error that has no field, and that would not appear in your form.
