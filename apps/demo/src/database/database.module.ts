import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DatabaseSeeder } from './database.seeder'
import { Contact } from './entities/contact.entity'
import { Note } from './entities/note.entity'
import { Organization } from './entities/organization.entity'
import { User } from './entities/user.entity'

const entities = [User, Organization, Contact, Note]

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      // A file rather than :memory: so the seeded data survives tsx watch restarts.
      database: new URL('../../demo.sqlite', import.meta.url).pathname,
      entities,
      // Demo app: let TypeORM own the schema instead of shipping migrations.
      synchronize: true,
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [DatabaseSeeder],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
