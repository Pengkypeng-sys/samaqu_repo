import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum NotificationType {
  BUKTI_BAYAR_BARU = 'bukti_bayar_baru',
  STOK_MENIPIS = 'stok_menipis',
  ORDER_BARU = 'order_baru',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  WEB_PUSH = 'web_push',
  TELEGRAM = 'telegram',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ nullable: true })
  order_id: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  sent_via: NotificationChannel;

  @CreateDateColumn()
  created_at: Date;
}
