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

  @OneToMany(() => Note, (note) => note.user)
  notes!: Note[]
}
