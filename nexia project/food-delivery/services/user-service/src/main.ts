// ─────────────────────────────────────────────────────────
//  User Service — Entry Point
//  Tracing MUST be initialized before any NestJS imports
// ─────────────────────────────────────────────────────────
import { initTracing } from '../../shared/tracing';
initTracing('user-service');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Validation ───────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ── CORS ─────────────────────────────────────────────
  app.enableCors();

  // ── Swagger ──────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('Authentication and user profile management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // ── gRPC Microservice ────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../../shared/proto/user.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT || 50051}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3001);

  console.log(`[UserService] HTTP  → http://localhost:${process.env.PORT || 3001}`);
  console.log(`[UserService] gRPC  → 0.0.0.0:${process.env.GRPC_PORT || 50051}`);
  console.log(`[UserService] Docs  → http://localhost:${process.env.PORT || 3001}/docs`);
}

bootstrap();
