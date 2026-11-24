import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://mongodb:27017/food_orders'),
      }),
    }),
    // ── gRPC Client: Restaurant Service ─────────────────
    ClientsModule.registerAsync([
      {
        name: 'RESTAURANT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'restaurant',
            protoPath: join(__dirname, '../../shared/proto/restaurant.proto'),
            url: config.get<string>('RESTAURANT_GRPC_URL', 'restaurant-service:50052'),
          },
        }),
      },
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(__dirname, '../../shared/proto/user.proto'),
            url: config.get<string>('USER_GRPC_URL', 'user-service:50051'),
          },
        }),
      },
    ]),
    OrdersModule,
  ],
})
export class AppModule {}
