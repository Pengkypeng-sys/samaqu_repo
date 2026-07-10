import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [HttpModule],
  providers: [ShippingService],
  controllers: [ShippingController],
})
export class ShippingModule {}
