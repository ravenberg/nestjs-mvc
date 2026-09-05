import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View, scroll } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Contact } from '../database/entities/contact.entity'
import { Organization } from '../database/entities/organization.entity'
import { paginateAfter } from '../pagination'

@Controller('organizations')
export class OrganizationsController {
  constructor(
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  @Get()
  @View('Organizations/Index')
  async index(@Query('search') search?: string) {
    const query = this.organizations.createQueryBuilder('organization').orderBy('organization.name', 'ASC')

    if (search) query.andWhere('organization.name LIKE :term', { term: `%${search}%` })

    const organizations = await query.getMany()

    // One grouped count instead of N+1, mapped onto the rows below.
    const counts = await this.contacts
      .createQueryBuilder('contact')
      .select('contact.organizationId', 'organizationId')
      .addSelect('COUNT(*)', 'count')
      .where('contact.organizationId IS NOT NULL')
      .groupBy('contact.organizationId')
      .getRawMany<{ organizationId: number; count: number }>()

    const countByOrganization = new Map(counts.map((row) => [Number(row.organizationId), Number(row.count)]))

    return {
      filters: { search: search ?? '' },
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        city: organization.city,
        contactCount: countByOrganization.get(organization.id) ?? 0,
      })),
    }
  }

  @Get(':id')
  @View('Organizations/Show')
  async show(@Param('id', ParseIntPipe) id: number, @Query('cursor') cursor?: string) {
    const organization = await this.organizations.findOne({ where: { id } })
    if (!organization) throw new NotFoundException(`No organization with id ${id}`)

    return {
      organization: { id: organization.id, name: organization.name, city: organization.city },
      // Deferred *and* scrollable: the header renders first, the first page follows
      // in the client's follow-up request, and further pages use a keyset cursor.
      contacts: scroll(
        () =>
          paginateAfter(
            this.contacts.createQueryBuilder('contact').where('contact.organizationId = :id', { id }),
            {
              after: cursor,
              perPage: 4,
              map: (contact) => ({
                id: contact.id,
                name: `${contact.firstName} ${contact.lastName}`,
                email: contact.email,
                isFavorite: contact.isFavorite,
              }),
            },
          ),
        { defer: true },
      ),
    }
  }
}
