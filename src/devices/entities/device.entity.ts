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

  @Column({ type: 'int', nullable: true })
  last_battery_percent?: number | null;

  @Column({ type: 'boolean', nullable: true })
  last_usb_connected?: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  last_battery_charging?: boolean | null;

  @Column({ type: 'datetime', nullable: true })
  last_power_at?: Date | null;

  @Column({ default: false })
  battery_low_alert_active: boolean;

  @Column({ default: false })
  battery_full_alert_active: boolean;

  @Column({ length: 20, nullable: true })
  sim_msisdn?: string | null;

  @Column({ length: 8, nullable: true })
  sms_command_pin?: string | null;
}
