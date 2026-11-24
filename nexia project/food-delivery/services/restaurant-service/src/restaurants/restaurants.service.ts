import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from './restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
  ) {}

  create(dto: CreateRestaurantDto): Promise<RestaurantDocument> {
    return new this.restaurantModel(dto).save();
  }

  findAll(cuisineType?: string): Promise<RestaurantDocument[]> {
    const filter: any = {};
    if (cuisineType) filter.cuisineType = new RegExp(cuisineType, 'i');
    return this.restaurantModel.find(filter).exec();
  }

  async findById(id: string): Promise<RestaurantDocument> {
    const r = await this.restaurantModel.findById(id);
    if (!r) throw new NotFoundException(`Restaurant ${id} not found`);
    return r;
  }

  async update(id: string, dto: Partial<CreateRestaurantDto>): Promise<RestaurantDocument> {
    const r = await this.restaurantModel.findByIdAndUpdate(id, dto, { new: true });
    if (!r) throw new NotFoundException(`Restaurant ${id} not found`);
    return r;
  }

  async remove(id: string): Promise<void> {
    await this.restaurantModel.findByIdAndDelete(id);
  }
}
