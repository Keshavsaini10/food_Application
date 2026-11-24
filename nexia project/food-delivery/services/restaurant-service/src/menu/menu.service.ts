import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem, MenuItemDocument } from './menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  create(restaurantId: string, dto: CreateMenuItemDto): Promise<MenuItemDocument> {
    return new this.menuItemModel({ ...dto, restaurantId: new Types.ObjectId(restaurantId) }).save();
  }

  findByRestaurant(restaurantId: string): Promise<MenuItemDocument[]> {
    return this.menuItemModel.find({ restaurantId: new Types.ObjectId(restaurantId), available: true });
  }

  async findById(id: string): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findById(id);
    if (!item) throw new NotFoundException(`MenuItem ${id} not found`);
    return item;
  }

  async findByIds(ids: string[]): Promise<MenuItemDocument[]> {
    return this.menuItemModel.find({ _id: { $in: ids }, available: true });
  }

  async validateOrder(
    restaurantId: string,
    items: Array<{ menuItemId: string; quantity: number }>,
  ): Promise<{ valid: boolean; message: string; totalPrice: number; pricedItems: any[] }> {
    const menuItems = await this.findByIds(items.map((i) => i.menuItemId));
    const menuMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    const pricedItems = [];
    let totalPrice = 0;

    for (const item of items) {
      const menuItem = menuMap.get(item.menuItemId);
      if (!menuItem) {
        return { valid: false, message: `Menu item ${item.menuItemId} not found or unavailable`, totalPrice: 0, pricedItems: [] };
      }
      if (menuItem.restaurantId.toString() !== restaurantId) {
        return { valid: false, message: `Menu item ${item.menuItemId} does not belong to restaurant`, totalPrice: 0, pricedItems: [] };
      }
      const subtotal = menuItem.price * item.quantity;
      totalPrice += subtotal;
      pricedItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        subtotal,
      });
    }

    return { valid: true, message: 'OK', totalPrice, pricedItems };
  }

  async update(id: string, dto: Partial<CreateMenuItemDto>): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findByIdAndUpdate(id, dto, { new: true });
    if (!item) throw new NotFoundException(`MenuItem ${id} not found`);
    return item;
  }

  remove(id: string): Promise<any> {
    return this.menuItemModel.findByIdAndDelete(id);
  }
}
