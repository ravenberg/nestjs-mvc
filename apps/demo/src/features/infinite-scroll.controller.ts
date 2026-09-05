import { Controller, Get, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View, scroll } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Note } from '../database/entities/note.entity'
import { paginate } from '../pagination'

/**
 * Data Loading → Infinite Scroll. Lands mid-way (`?page=3` from the sidebar) so
 * both ends load as you scroll: up prepends, down appends. The client says which
 * end it wants through `X-Inertia-Infinite-Scroll-Merge-Intent`, and the adapter
 * answers with `prependProps` or `mergeProps` accordingly.
 */
@Controller('features/data-loading')
export class InfiniteScrollController {
  constructor(@InjectRepository(Note) private readonly notes: Repository<Note>) {}

  @Get('infinite-scroll')
  @View('Features/DataLoading/InfiniteScroll')
  infiniteScroll(@Query('page') page?: string) {
    return {
      notes: scroll(() =>
        paginate(
          this.notes
            .createQueryBuilder('note')
            .leftJoinAndSelect('note.user', 'user')
            .leftJoinAndSelect('note.contact', 'contact')
            .orderBy('note.createdAt', 'DESC')
            .addOrderBy('note.id', 'DESC'),
          {
            page,
            perPage: 15,
            map: (note) => ({
              id: note.id,
              body: note.body,
              createdAt: note.createdAt,
              user: note.user.name,
              contact: { id: note.contact.id, name: `${note.contact.firstName} ${note.contact.lastName}` },
            }),
          },
        ),
      ),
    }
  }
}
