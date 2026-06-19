import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('devices')
@Index(['device_id'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32 })
  device_id: string;

  @Column({ default: false })
  blocked: boolean;

  @Column({ type: 'datetime', nullable: true })
  blocked_at?: Date;

  @Column({ length: 255, nullable: true })
  blocked_reason?: string;

  @Column('double', { nullable: true })
  last_latitude?: number;

  @Column('double', { nullable: true })
  last_longitude?: number;

  @Column({ length: 8, nullable: true })
  last_location_source?: string;

  @CreateDateColumn()
  first_seen_at: Date;

  @UpdateDateColumn()
  last_seen_at: Date;

  @Column({ type: 'datetime', nullable: true })
  emergency_until?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  emergency_activated_at?: Date | null;
}
