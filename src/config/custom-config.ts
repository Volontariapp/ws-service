import { BaseConfig, RedisConfig } from '@volontariapp/config';
import { MsAuthConfig } from '@volontariapp/config';
import { Type } from 'class-transformer';
import { IsDefined, IsNumber, IsString, ValidateNested } from 'class-validator';

export class PostProcessorConfig {
  @IsDefined()
  @IsString()
  groupName!: string;

  @IsDefined()
  @IsNumber()
  batchSize!: number;

  @IsDefined()
  @IsNumber()
  blockTimeout!: number;

  @IsDefined()
  @IsNumber()
  idempotencyTtlSeconds!: number;

  @IsDefined()
  @IsNumber()
  maxRetries!: number;

  @IsDefined()
  @IsNumber()
  retryDelayMs!: number;
}

export class CustomConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  globalRedis!: RedisConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => PostProcessorConfig)
  postProcessor!: PostProcessorConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => MsAuthConfig)
  auth!: MsAuthConfig;
}
