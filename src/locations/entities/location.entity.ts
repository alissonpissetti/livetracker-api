import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  device_id: string;

  @Column('real')
  latitude: number;

  @Column('real')
  longitude: number;

  @Column('real', { nullable: true })
  altitude?: number;

  @Column('real', { nullable: true })
  speed_knots?: number;

  @Column('real', { nullable: true })
  accuracy_m?: number;

  @Column('integer', { nullable: true })
  satellites_visible?: number;

  @Column('integer', { nullable: true })
  satellites_used?: number;

  @Column({ nullable: true })
  imei?: string;

  @Column({ nullable: true })
  iccid?: string;

  @Column({ nullable: true })
  imsi?: string;

  @Column({ nullable: true })
  operator?: string;

  @Column({ nullable: true })
  apn?: string;

  @Column()
  recorded_at: string;

  @CreateDateColumn()
  received_at: Date;
}
