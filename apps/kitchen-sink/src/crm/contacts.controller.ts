import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View, defer, scroll } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Contact } from '../database/entities/contact.entity'
import { Note } from '../database/entities/note.entity'
import { paginate } from '../pagination'

const PAGE_SIZE = 15

@Controller('contacts')
export class ContactsController {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  @Get()
  @View('Contacts/Index')
  index(
    @Query('search') search?: string,
    @Query('favorite') favorite?: string,
    @Query('page') page?: string,
  ) {
    return {
      filters: { search: search ?? '', favorite: favorite === '1' },
      // Infinite scroll: the client asks for `?page=N` and appends `contacts.data`.
      // Changing a filter resets the prop, so the list starts over from page 1.
      contacts: scroll(() => {
        const query = this.contacts
          .createQueryBuilder('contact')
          .leftJoinAndSelect('contact.organization', 'organization')
          .orderBy('contact.firstName', 'ASC')
          .addOrderBy('contact.lastName', 'ASC')

        if (search) {
          query.andWhere(
            '(contact.firstName LIKE :term OR contact.lastName LIKE :term OR contact.email LIKE :term)',
            { term: `%${search}%` },
          )
        }
        if (favorite === '1') query.andWhere('contact.isFavorite = :fav', { fav: true })

        return paginate(query, { page, perPage: PAGE_SIZE, map: (contact) => this.serialize(contact) })
      }),
    }
  }

  @Get(':id')
  @View('Contacts/Show')
  async show(@Param('id', ParseIntPipe) id: number) {
    const contact = await this.contacts.findOne({
      where: { id },
      relations: { organization: true },
    })
    if (!contact) throw new NotFoundException(`No contact with id ${id}`)

    return {
      contact: this.serialize(contact),
      // Deferred: the profile renders instantly, notes stream in after.
      notes: defer(async () => {
        const notes = await this.notes.find({
          where: { contactId: id },
          relations: { user: true },
          order: { createdAt: 'DESC' },
        })
        return notes.map((note) => ({
          id: note.id,
          body: note.body,
          createdAt: note.createdAt,
          user: { id: note.user.id, name: note.user.name },
        }))
      }),
    }
  }

  private serialize(contact: Contact) {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      phone: contact.phone,
      isFavorite: contact.isFavorite,
      organization: contact.organization
        ? { id: contact.organization.id, name: contact.organization.name }
        : null,
    }
  }
}
