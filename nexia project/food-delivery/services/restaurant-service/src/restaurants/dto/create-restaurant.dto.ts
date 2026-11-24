import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Spice Garden' })
  @IsString()
  name: string;

  @ApiProperty({ example: '15 Brigade Road, Bangalore' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Indian' })
  @IsString()
  cuisineType: string;

  @ApiProperty({ example: 30, description: 'Estimated delivery time in minutes' })
  @IsNumber()
  @IsOptional()
  estimatedDeliveryMinutes?: number;

  @ApiProperty({ example: 100, description: 'Minimum order amount in rupees' })
  @IsNumber()
  @IsOptional()
  minimumOrder?: number;

  @ApiProperty({ example: 25, description: 'Delivery fee in rupees' })
  @IsNumber()
  @IsOptional()
  deliveryFee?: number;
}
