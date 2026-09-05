import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'
import { z } from 'zod'

/**
 * Forms → Dotted Keys. A nested form validated by a Zod schema through NestJS
 * v12's `@Body({ schema })` and `StandardSchemaValidationPipe` (registered in
 * `main.ts` with `standardSchemaExceptionFactory`). Standard Schema reports
 * nested paths as arrays; the adapter joins them into the dot keys Inertia's
 * form helpers expect: `errors['user.email']`, `errors['address.city']`.
 */
const CreateContactSchema = z.object({
  user: z.object({
    name: z.string().trim().min(2, 'Give the contact a name of at least 2 characters.'),
    email: z.email('That does not look like an email address.'),
  }),
  address: z.object({
    city: z.string().trim().min(1, 'Which city?'),
    postcode: z.string().regex(/^\d{4} ?[A-Z]{2}$/i, 'A Dutch postcode looks like 1234 AB.'),
  }),
  tags: z.array(z.string().min(1, 'Empty tag.')).max(3, 'At most three tags.'),
})

type CreateContact = z.infer<typeof CreateContactSchema>

const submissions: CreateContact[] = []

@Controller('features/forms')
export class DottedKeysController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('dotted-keys')
  @View('Features/Forms/DottedKeys')
  page() {
    return { submissions }
  }

  @Post('dotted-keys')
  store(@Body({ schema: CreateContactSchema }) body: CreateContact) {
    submissions.unshift(body)
    return this.view.flash('message', `Saved ${body.user.name}.`).back()
  }
}
