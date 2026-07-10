import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './payment.entity';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { OrderStatus } from '../orders/order.entity';
import { configureCloudinary, uploadBuffer } from './cloudinary';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private repo: Repository<Payment>,
    private ordersService: OrdersService,
    private notifications: NotificationsService,
    config: ConfigService,
  ) {
    configureCloudinary(config);
  }

  async uploadProof(token: string, file: Express.Multer.File) {
    const order = await this.ordersService.findByToken(token);
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.status !== OrderStatus.MENUNGGU_PEMBAYARAN) {
      throw new BadRequestException('Order tidak dalam status menunggu pembayaran');
    }

    const imageUrl = await uploadBuffer(file.buffer);
    const payment = this.repo.create({
      order,
      proof_image_url: imageUrl,
      status: PaymentStatus.MENUNGGU_VERIFIKASI,
    });
    await this.repo.save(payment);

    await this.notifications.send(
      NotificationType.BUKTI_BAYAR_BARU,
      `Bukti bayar baru untuk order #${order.id} (${order.customer_name})`,
      order.id,
    );
    return payment;
  }

  async verify(id: number, approved: boolean, csId: number, notes?: string) {
    const payment = await this.repo.findOne({ where: { id }, relations: { order: true } });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');

    payment.status = approved ? PaymentStatus.TERVERIFIKASI : PaymentStatus.DITOLAK;
    payment.verified_by = { id: csId } as any;
    payment.verified_at = new Date();
    if (notes) payment.notes = notes;
    await this.repo.save(payment);

    if (approved) {
      await this.ordersService.markProcessed(payment.order.id, csId);
    } else {
      // revert order back so customer can re-upload
      await this.ordersService['orders'].update(payment.order.id, {
        status: OrderStatus.MENUNGGU_PEMBAYARAN,
      });
    }
    return payment;
  }

  findByOrder(orderId: number) {
    return this.repo.find({ where: { order: { id: orderId } }, order: { uploaded_at: 'DESC' } });
  }
}
