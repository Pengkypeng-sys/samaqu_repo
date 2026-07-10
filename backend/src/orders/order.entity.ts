import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  DRAFT = 'draft',
  MENUNGGU_PEMBAYARAN = 'menunggu_pembayaran',
  MENUNGGU_VERIFIKASI = 'menunggu_verifikasi',
  DIPROSES = 'diproses',
  DIKIRIM = 'dikirim',
  SELESAI = 'selesai',
  DIBATALKAN = 'dibatalkan',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer_name: string;

  @Column()
  wa_number_or_ig: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cs_id' })
  cs: User;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ unique: true })
  payment_token: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_price: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  created_at: Date;
}
