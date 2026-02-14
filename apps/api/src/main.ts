import 'reflect-metadata';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma-db/prisma.service';
import * as express from 'express';

async function bootstrap() {
  const port = parseInt(process.env.PORT ?? '4123', 10);

  // Ensure database is initialized before NestJS starts
  const dbPath = process.env.DATABASE_PATH ?? join(process.cwd(), 'production.db');
  PrismaService.initializeProductionDb(dbPath);

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  
  // Increase body size limit for product images (base64-encoded)
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api');

  await app.listen(port, '127.0.0.1');
  console.log(`[API] NestJS server listening on http://127.0.0.1:${port}`);

  // Notify parent process (Electron) that server is ready.
  // utilityProcess (production): process.parentPort is available
  // child_process.fork (dev):    process.send is available
  const parentPort = (process as any).parentPort;
  if (parentPort && typeof parentPort.postMessage === 'function') {
    parentPort.postMessage({ type: 'ready', port });
  } else if (process.send) {
    process.send({ type: 'ready', port });
  }
}

bootstrap().catch((err) => {
  console.error('[API] Failed to start NestJS server:', err);
  process.exit(1);
});
