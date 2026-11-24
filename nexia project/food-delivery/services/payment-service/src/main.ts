import { initTracing } from '../../shared/tracing';
initTracing('payment-service');

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // RabbitMQ consumer for OrderPlaced events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'],
      queue: 'payment_queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Payment Service API')
    .setDescription('Wallet management and payment processing via Saga')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3004);
  console.log(`[PaymentService] HTTP → http://localhost:${process.env.PORT || 3004}`);
}

bootstrap();
