import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('locations')
@Index(['device_id', 'received_at'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32 })
  device_id: string;

  @Column('double')
  latitude: number;

  @Column('double')
  longitude: number;

  @Column('double', { nullable: true })
  altitude?: number;

  @Column('double', { nullable: true })
  speed_knots?: number;

  @Column('double', { nullable: true })
  accuracy_m?: number;

  @Column('int', { nullable: true })
  satellites_visible?: number;

  @Column('int', { nullable: true })
  satellites_used?: number;

  @Column({ length: 20, nullable: true })
  imei?: string;

  @Column({ length: 24, nullable: true })
  iccid?: string;

  @Column({ length: 20, nullable: true })
  imsi?: string;

  @Column({ length: 64, nullable: true })
  operator?: string;

  @Column({ length: 128, nullable: true })
  apn?: string;

  @Column({ length: 32 })
  recorded_at: string;

  @CreateDateColumn()
  received_at: Date;
}
