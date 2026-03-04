import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.enableCors({ origin: '*' });
  await app.init(); // Required when using ExpressAdapter
  await server.listen(process.env.PORT);
}
bootstrap();
