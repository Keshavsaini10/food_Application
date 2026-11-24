import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';

/**
 * Initialize OpenTelemetry SDK with Jaeger exporter.
 * Call this BEFORE importing NestJS application modules.
 *
 * @param serviceName - The name of the service (shown in Jaeger UI)
 */
export function initTracing(serviceName: string): NodeSDK {
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
    spanProcessor: new SimpleSpanProcessor(jaegerExporter),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new MongoDBInstrumentation(),
      new AmqplibInstrumentation(),
      new GrpcInstrumentation(),
    ],
  });

  sdk.start();
  console.log(`[Tracing] OpenTelemetry initialized for service: ${serviceName}`);

  process.on('SIGTERM', async () => {
    await sdk.shutdown();
    console.log('[Tracing] SDK shut down cleanly.');
  });

  return sdk;
}

// Re-export commonly used tracing primitives
export { trace, context, SpanStatusCode } from '@opentelemetry/api';
