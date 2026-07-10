import {
  Body, Controller, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  // public — customer upload without login
  @Post('bayar/:token/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadProof(token, file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('payments/:id/verify')
  verify(
    @Param('id') id: string,
    @Body() body: { approved: boolean; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.verify(+id, body.approved, user.id, body.notes);
  }
}
