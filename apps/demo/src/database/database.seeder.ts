import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contact } from './entities/contact.entity'
import { Note } from './entities/note.entity'
import { Organization } from './entities/organization.entity'
import { User } from './entities/user.entity'

const ORGANIZATIONS = [
  'Acme Corporation', 'Globex', 'Initech', 'Umbrella Health', 'Soylent Industries',
  'Hooli', 'Pied Piper', 'Stark Industries', 'Wayne Enterprises', 'Cyberdyne Systems',
  'Tyrell Corporation', 'Wonka Industries', 'Duff Brewing', 'Vehement Capital', 'Massive Dynamic',
]

const CITIES = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen', 'Delft', 'Leiden']

const FIRST_NAMES = [
  'Ada', 'Grace', 'Margaret', 'Alan', 'Linus', 'Barbara', 'Katherine', 'Dennis', 'Ken', 'Radia',
  'Anita', 'Jean', 'Tim', 'Vint', 'Sophie', 'Lena', 'Noor', 'Sam', 'Jules', 'Robin',
]

const LAST_NAMES = [
  'Lovelace', 'Hopper', 'Hamilton', 'Turing', 'Torvalds', 'Liskov', 'Johnson', 'Ritchie',
  'Thompson', 'Perlman', 'Borg', 'Bartik', 'Berners-Lee', 'Cerf', 'de Vries', 'Jansen',
]

const NOTE_BODIES = [
  'Called about the renewal, wants a quote by Friday.',
  'Introduced to the new account manager.',
  'Asked for a demo of the reporting module.',
  'Follow up after the conference next month.',
  'Sent over the updated pricing sheet.',
  'Mentioned they are evaluating a competitor.',
  'Happy with onboarding, might expand seats.',
  'Requested an invoice correction.',
]

/** Deterministic pseudo-random so the demo data is stable across restarts. */
function makeRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

@Injectable()
export class DatabaseSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeeder.name)

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if ((await this.users.count()) > 0) return

    const random = makeRandom(42)
    const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]

    const testUser = await this.users.save(
      this.users.create({ name: 'Test User', email: 'test@example.com' }),
    )
    const otherUsers = await this.users.save(
      ['Robin Fox', 'Sam Reed', 'Nour Haddad'].map((name, i) =>
        this.users.create({ name, email: `user${i + 1}@example.com` }),
      ),
    )
    const allUsers = [testUser, ...otherUsers]

    const organizations = await this.organizations.save(
      ORGANIZATIONS.map((name) => this.organizations.create({ name, city: pick(CITIES) })),
    )

    // 100 contacts: 75 attached to an organization, 25 without — mirrors the
    // official demo so the "no organization" empty states are exercised.
    const contacts = await this.contacts.save(
      Array.from({ length: 100 }, (_, i) => {
        const firstName = pick(FIRST_NAMES)
        const lastName = pick(LAST_NAMES)
        return this.contacts.create({
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}${i}@example.com`,
          phone: `06-${String(Math.floor(random() * 90000000) + 10000000)}`,
          isFavorite: random() < 0.2,
          organization: i < 75 ? pick(organizations) : null,
        })
      }),
    )

    // Notes on 40 random contacts, 1–5 each, spread over the last 30 days so the
    // "this week" counter and the activity feed show a realistic range.
    const noted = [...contacts].sort(() => random() - 0.5).slice(0, 40)
    const dayMs = 24 * 60 * 60 * 1000
    await this.notes.save(
      noted.flatMap((contact) =>
        Array.from({ length: Math.floor(random() * 5) + 1 }, () =>
          this.notes.create({
            body: pick(NOTE_BODIES),
            contact,
            user: pick(allUsers),
            createdAt: new Date(Date.now() - Math.floor(random() * 30) * dayMs),
          }),
        ),
      ),
    )

    this.logger.log(
      `Seeded ${allUsers.length} users, ${organizations.length} organizations, ${contacts.length} contacts`,
    )
  }
}
