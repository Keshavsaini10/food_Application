import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { MenuService } from '../menu/menu.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly menuService: MenuService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a restaurant' })
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List restaurants (optionally filter by cuisine)' })
  @ApiQuery({ name: 'cuisine', required: false })
  findAll(@Query('cuisine') cuisine?: string) {
    return this.restaurantsService.findAll(cuisine);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRestaurantDto>) {
    return this.restaurantsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }

  @Get(':id/menu')
  @ApiOperation({ summary: 'Get menu for a restaurant' })
  getMenu(@Param('id') id: string) {
    return this.menuService.findByRestaurant(id);
  }

  // ── gRPC Handlers ─────────────────────────────────────

  @GrpcMethod('RestaurantService', 'GetRestaurant')
  async getRestaurant(data: { restaurantId: string }) {
    const r = await this.restaurantsService.findById(data.restaurantId);
    return {
      id: r._id.toString(),
      name: r.name,
      address: r.address,
      isOpen: r.isOpen,
      cuisineType: r.cuisineType,
      rating: r.rating,
    };
  }

  @GrpcMethod('RestaurantService', 'ValidateOrder')
  async validateOrder(data: { restaurantId: string; items: Array<{ menuItemId: string; quantity: number }> }) {
    const result = await this.menuService.validateOrder(data.restaurantId, data.items);
    return {
      valid: result.valid,
      message: result.message,
      totalPrice: result.totalPrice,
      pricedItems: result.pricedItems,
    };
  }

  @GrpcMethod('RestaurantService', 'GetMenuItem')
  async getMenuItem(data: { menuItemId: string }) {
    const item = await this.menuService.findById(data.menuItemId);
    return {
      id: item._id.toString(),
      name: item.name,
      price: item.price,
      description: item.description,
      available: item.available,
      category: item.category,
    };
  }

  @GrpcMethod('RestaurantService', 'GetMenuItems')
  async getMenuItems(data: { menuItemIds: string[] }) {
    const items = await this.menuService.findByIds(data.menuItemIds);
    return {
      items: items.map((i) => ({
        id: i._id.toString(),
        name: i.name,
        price: i.price,
        description: i.description,
        available: i.available,
        category: i.category,
      })),
    };
  }
}
