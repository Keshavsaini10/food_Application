import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({ ...dto, password: hashed });
    return user.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find({ isActive: true }).select('-password');
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true })
      .select('-password');
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async topUpWallet(id: string, amount: number): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $inc: { walletBalance: amount } }, { new: true })
      .select('-password');
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async deductWallet(id: string, amount: number): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.walletBalance < amount) throw new ConflictException('Insufficient wallet balance');
    return this.userModel
      .findByIdAndUpdate(id, { $inc: { walletBalance: -amount } }, { new: true })
      .select('-password');
  }

  async remove(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { isActive: false });
  }
}
