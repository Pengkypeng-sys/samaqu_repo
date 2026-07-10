import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationChannel, NotificationType } from './notification.entity';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    private http: HttpService,
    private config: ConfigService,
  ) {}

  async send(type: NotificationType, message: string, orderId?: number) {
    await this.repo.save(
      this.repo.create({ type, message, order_id: orderId, sent_via: NotificationChannel.IN_APP }),
    );
    await this.sendTelegram(message, orderId);
  }

  getUnread() {
    return this.repo.find({ order: { created_at: 'DESC' }, take: 50 });
  }

  private async sendTelegram(message: string, orderId?: number) {
    const token = this.config.get('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;
    const text = orderId ? `[Order #${orderId}] ${message}` : message;
    try {
      await firstValueFrom(
        this.http.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text,
        }),
      );
      await this.repo.save(
        this.repo.create({
          type: NotificationType.ORDER_BARU,
          message,
          order_id: orderId,
          sent_via: NotificationChannel.TELEGRAM,
        }),
      );
    } catch (e) {
      this.log.warn(`Telegram send failed: ${e.message}`);
    }
  }
}
