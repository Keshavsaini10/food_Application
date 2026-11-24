import { initTracing } from '../../shared/tracing';
initTracing('restaurant-service');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Restaurant Service API')
    .setDescription('Restaurant catalog and menu management with gRPC server')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // gRPC server – used by Order Service for pricing and validation
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'restaurant',
      protoPath: join(__dirname, '../../shared/proto/restaurant.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT || 50052}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3002);

  console.log(`[RestaurantService] HTTP  → http://localhost:${process.env.PORT || 3002}`);
  console.log(`[RestaurantService] gRPC  → 0.0.0.0:${process.env.GRPC_PORT || 50052}`);
}

bootstrap();
