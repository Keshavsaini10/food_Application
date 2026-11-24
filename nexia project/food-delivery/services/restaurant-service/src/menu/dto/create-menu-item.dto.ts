import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Paneer Tikka' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Marinated cottage cheese grilled in tandoor' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 280, description: 'Price in rupees' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'Starters' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isVegetarian?: boolean;

  @ApiProperty({ example: 15, description: 'Preparation time in minutes' })
  @IsNumber()
  @IsOptional()
  preparationTimeMinutes?: number;
}
