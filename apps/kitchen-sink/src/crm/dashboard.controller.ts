import { Controller, Get } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View, defer } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Contact } from '../database/entities/contact.entity'
import { Note } from '../database/entities/note.entity'
import { Organization } from '../database/entities/organization.entity'

@Controller()
export class DashboardController {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  @Get('dashboard')
  @View('Crm/Dashboard')
  async dashboard() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    return {
      // The counters are deferred: the page paints immediately and the client
      // fetches these in a follow-up partial request.
      totalContacts: defer(() => this.contacts.count()),
      totalOrganizations: defer(() => this.organizations.count()),
      recentNotesCount: defer(() =>
        this.notes.createQueryBuilder('note').where('note.createdAt >= :weekAgo', { weekAgo }).getCount(),
      ),
      // Eager, so there is something meaningful on the first paint.
      recentActivity: await this.recentActivity(),
    }
  }

  private async recentActivity() {
    const notes = await this.notes.find({
      relations: { contact: true, user: true },
      order: { createdAt: 'DESC' },
      take: 10,
    })

    return notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt,
      user: { id: note.user.id, name: note.user.name },
      contact: { id: note.contact.id, name: `${note.contact.firstName} ${note.contact.lastName}` },
    }))
  }
}
