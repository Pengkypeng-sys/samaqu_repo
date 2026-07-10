import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';

export enum PaymentStatus {
  MENUNGGU_VERIFIKASI = 'menunggu_verifikasi',
  TERVERIFIKASI = 'terverifikasi',
  DITOLAK = 'ditolak',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  proof_image_url: string;

  @CreateDateColumn()
  uploaded_at: Date;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.MENUNGGU_VERIFIKASI })
  status: PaymentStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by_cs_id' })
  verified_by: User;

  @Column({ nullable: true })
  verified_at: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;
}
