import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ── Config ───────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Database ─────────────────────────────────────
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://mongodb:27017/food_users'),
        connectionFactory: (connection) => {
          console.log('[UserService] MongoDB connected to food_users');
          return connection;
        },
      }),
    }),

    // ── Feature Modules ──────────────────────────────
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
