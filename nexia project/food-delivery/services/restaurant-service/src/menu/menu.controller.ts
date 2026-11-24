import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';

@ApiTags('menu')
@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @ApiOperation({ summary: 'Add menu item to restaurant' })
  create(@Param('restaurantId') restaurantId: string, @Body() dto: CreateMenuItemDto) {
    return this.menuService.create(restaurantId, dto);
  }

  @Get()
  findAll(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findByRestaurant(restaurantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateMenuItemDto>) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuService.remove(id);
  }
}
