import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Note } from './note.entity'

/**
 * Every column declares an explicit `type`: the build runs with
 * `emitDecoratorMetadata: false`, so TypeORM cannot infer them from reflection.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', unique: true })
  email!: string

  /** scrypt, see `auth/passwords.ts`. Left out of every query unless asked for. */
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash?: string | null

  /** When the address was confirmed through a signed link; `null` until then. */
  @Column({ type: 'datetime', nullable: true })
  emailVerifiedAt?: Date | null

  @OneToMany(() => Note, (note) => note.user)
  notes!: Note[]
}
