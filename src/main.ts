import 'reflect-metadata';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/app-config.service.js';
import { loadConfig } from '@volontariapp/config';
import { CustomConfig } from './config/custom-config.js';
import { Logger } from '@volontariapp/logger';

function resolveConfigDirectory(): string {
  const currentFileDir = dirname(fileURLToPath(import.meta.url));
  const repositoryRootDir = join(currentFileDir, '..');
  const rootConfigDir = join(repositoryRootDir, 'config');
  if (existsSync(rootConfigDir)) {
    return rootConfigDir;
  }

  throw new Error(`Config directory not found: ${rootConfigDir}`);
}

async function bootstrap() {
  const appConfig = loadConfig(resolveConfigDirectory(), CustomConfig);
  const logger = new Logger({
    context: 'WS-SERVICE',
    format: appConfig.logger.format,
  });

  const app = await NestFactory.create(AppModule.register(appConfig), {
    logger,
  });

  const configService = app.get(AppConfigService);

  await app.listen(configService.port);
  logger.info(`WebSocket service is listening on port ${String(configService.port)}`);
}

void bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
