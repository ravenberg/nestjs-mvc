import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Contact } from './contact.entity'
import { User } from './user.entity'

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text' })
  body!: string

  @Column({ type: 'int' })
  contactId!: number

  @ManyToOne(() => Contact, (contact) => contact.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact!: Contact

  @Column({ type: 'int' })
  userId!: number

  @ManyToOne(() => User, (user) => user.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User

  @CreateDateColumn()
  createdAt!: Date
}
