import { DataSource } from 'typeorm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { CustomConfig } from './custom-config.js';

import { loadConfig } from '@volontariapp/config';
import {
  databaseMapper,
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxModel,
  JobAuditModel,
  GatherStateModel,
} from '@volontariapp/database';

databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);

function resolveConfigDirectory(): string {
  const currentFileDir = dirname(fileURLToPath(import.meta.url));
  const repositoryRootDir = join(currentFileDir, '..', '..');
  const rootConfigDir = join(repositoryRootDir, 'config');
  if (existsSync(rootConfigDir)) {
    return rootConfigDir;
  }
  throw new Error(`Config directory not found: ${rootConfigDir}`);
}

const appConfig = loadConfig(resolveConfigDirectory(), CustomConfig);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: appConfig.db.host,
  port: appConfig.db.port,
  username: appConfig.db.username,
  password: appConfig.db.password,
  database: appConfig.db.database,
  ssl: appConfig.db.ssl ? { rejectUnauthorized: false } : false,
  entities: [EventQueueModel, JobsOutboxModel, JobAuditModel, GatherStateModel],
  synchronize: false,
  migrations: [
    join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '**', '*.{ts,js}'),
  ],
});
