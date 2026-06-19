import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../store/entities/order.entity';
import { DeviceIcon } from '../device-icon';

export type SubscriptionStatus =
  | 'pending_device'
  | 'active'
  | 'past_due'
  | 'canceled';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 255 })
  customer_email: string;

  @Column({ length: 120 })
  customer_name: string;

  @Index({ unique: true })
  @Column({ length: 32, nullable: true })
  device_id?: string;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device?: Device;

  @Column({ length: 16, default: 'pending_device' })
  status: SubscriptionStatus;

  @Column({ type: 'datetime' })
  current_period_end: Date;

  @Column({ type: 'datetime', nullable: true })
  current_period_start: Date | null;

  @Column({ nullable: true })
  order_id?: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ length: 120, nullable: true })
  label?: string;

  @Column({ length: 16, default: 'vehicle' })
  icon: DeviceIcon;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
