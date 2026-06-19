import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export type OrderStatus = 'paid' | 'pending';
export type OrderType = 'purchase' | 'renewal';
export type PaymentMethod = 'pix' | 'creditCard';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 120 })
  customer_name: string;

  @Column({ length: 255 })
  customer_email: string;

  @Column({ length: 14, nullable: true })
  customer_cpf: string | null;

  @Column({ length: 20, nullable: true })
  customer_phone: string | null;

  @Column({ length: 16, default: 'pending' })
  status: OrderStatus;

  @Column({ length: 16, default: 'purchase' })
  order_type: OrderType;

  @Column({ nullable: true })
  subscription_id: string | null;

  @Column({ type: 'int' })
  total_cents: number;

  @Column({ type: 'int', default: 0 })
  subtotal_cents: number;

  @Column({ type: 'int', default: 0 })
  discount_cents: number;

  @Column({ length: 32, nullable: true })
  voucher_code: string | null;

  @Column({ length: 16, nullable: true })
  payment_method: PaymentMethod | null;

  @Column({ length: 16, nullable: true })
  payment_status: PaymentStatus | null;

  @Column({ type: 'int', default: 0 })
  payment_discount_cents: number;

  @Column({ type: 'int', nullable: true })
  installment_count: number | null;

  @Column({ length: 64, nullable: true })
  asaas_customer_id: string | null;

  @Column({ length: 64, nullable: true })
  asaas_payment_id: string | null;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  created_at: Date;
}
