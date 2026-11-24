import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { DeliveryStatus } from './delivery.schema';

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all deliveries' })
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get delivery for an order' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.deliveriesService.findByOrder(orderId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update delivery status (driver app)' })
  updateStatus(@Param('id') id: string, @Body('status') status: DeliveryStatus) {
    return this.deliveriesService.updateStatus(id, status);
  }
}
