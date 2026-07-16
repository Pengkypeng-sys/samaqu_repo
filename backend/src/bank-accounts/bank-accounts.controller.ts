import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BankAccountsService } from './bank-accounts.service';

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private service: BankAccountsService) {}

  // Public — keyboard sync tanpa login
  @Get()
  getAll() { return this.service.getAll(); }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: any) { return this.service.create(dto); }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() dto: any) { return this.service.update(id, dto); }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: number) { return this.service.remove(id); }
}
