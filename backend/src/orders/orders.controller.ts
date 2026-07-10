import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { OrderStatus } from './order.entity';

@Controller()
export class OrdersController {
  constructor(private service: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  findAll(@Query('status') status?: OrderStatus) {
    return this.service.findAll(status);
  }

  // public — no JWT required
  @Get('bayar/:token')
  getByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }
}
