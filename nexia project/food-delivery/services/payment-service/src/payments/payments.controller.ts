import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment details for an order' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get payment history for a user' })
  findByUser(@Param('userId') userId: string) {
    return this.paymentsService.findByUser(userId);
  }
}
