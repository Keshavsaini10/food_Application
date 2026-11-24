import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpDto {
  @ApiProperty({ example: 500, description: 'Amount in rupees to add to wallet' })
  @IsNumber()
  @Min(1)
  amount: number;
}
