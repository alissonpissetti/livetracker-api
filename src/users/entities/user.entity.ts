import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type UserRole = 'customer' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 255 })
  password_hash: string;

  @Index({ unique: true })
  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ length: 14, nullable: true })
  cpf: string | null;

  @Column({ length: 64, nullable: true })
  asaas_customer_id: string | null;

  @Column({ length: 16, default: 'customer' })
  role: UserRole;

  @CreateDateColumn()
  created_at: Date;
}
