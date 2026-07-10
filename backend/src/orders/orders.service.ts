import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ProductsService } from '../products/products.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

interface CreateOrderDto {
  customer_name: string;
  wa_number_or_ig: string;
  items: Array<{ product_id: number; size?: string; qty: number }>;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(OrderItem) private items: Repository<OrderItem>,
    private products: ProductsService,
    private notifications: NotificationsService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, csId: number) {
    const payment_token = uuidv4();
    let total = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = await this.products.findOne(item.product_id);
      if (!product) throw new NotFoundException(`Produk ${item.product_id} tidak ditemukan`);
      const subtotal = Number(product.price) * item.qty;
      total += subtotal;
      orderItems.push({ product, size: item.size, qty: item.qty, price_at_order: product.price });
    }

    const order = this.orders.create({
      customer_name: dto.customer_name,
      wa_number_or_ig: dto.wa_number_or_ig,
      cs: { id: csId } as any,
      payment_token,
      total_price: total,
      status: OrderStatus.MENUNGGU_PEMBAYARAN,
      items: orderItems as OrderItem[],
    });

    const saved = await this.orders.save(order);
    await this.notifications.send(NotificationType.ORDER_BARU, `Order baru dari ${dto.customer_name}`, saved.id);
    return saved;
  }

  findAll(status?: OrderStatus) {
    return this.orders.find({
      where: status ? { status } : undefined,
      relations: { items: { product: true }, cs: true },
      order: { created_at: 'DESC' },
    });
  }

  findByToken(token: string) {
    return this.orders.findOne({
      where: { payment_token: token },
      relations: { items: { product: true } },
    });
  }

  findOne(id: number) {
    return this.orders.findOne({ where: { id }, relations: { items: { product: true }, cs: true } });
  }

  // called after payment verified — decrement stock in same transaction
  async markProcessed(orderId: number, csId: number) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { items: { product: true } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order tidak ditemukan');

      for (const item of order.items) {
        await this.products.decrementStock(item.product.id, item.size, item.qty, manager);
      }

      await manager.update(Order, orderId, { status: OrderStatus.DIPROSES });
    });
  }
}
