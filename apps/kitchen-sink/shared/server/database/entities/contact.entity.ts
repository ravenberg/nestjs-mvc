import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Note } from './note.entity'
import { Organization } from './organization.entity'

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar' })
  firstName!: string

  @Column({ type: 'varchar' })
  lastName!: string

  @Column({ type: 'varchar', nullable: true })
  email!: string | null

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null

  @Column({ type: 'boolean', default: false })
  isFavorite!: boolean

  @Column({ type: 'int', nullable: true })
  organizationId!: number | null

  @ManyToOne(() => Organization, (organization) => organization.contacts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization | null

  @OneToMany(() => Note, (note) => note.contact)
  notes!: Note[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  get name(): string {
    return `${this.firstName} ${this.lastName}`
  }
}
