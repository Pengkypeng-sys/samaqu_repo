import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ShippingService } from './shipping.service';

@UseGuards(JwtAuthGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private service: ShippingService) {}

  @Get('check')
  check(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('weight') weight: string,
    @Query('couriers') couriers?: string,
  ) {
    return this.service.check(origin, destination, +weight, couriers);
  }
}
