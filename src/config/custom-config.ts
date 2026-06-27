import { BaseConfig, RedisConfig, PostgresConfig } from '@volontariapp/config';
import { Type } from 'class-transformer';
import { IsDefined, IsNumber, IsString, ValidateNested, IsArray } from 'class-validator';

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

export class WsAuthConfig {
  @IsDefined()
  @IsString()
  internalPublicKeyPath!: string;

  @IsDefined()
  @IsString()
  accessTokenPublicKeyPath!: string;
}

export class AggregationConfig {
  @IsDefined()
  @IsString()
  trigger!: string;

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  expects!: string[];
}

export class ScatterGatherConfig {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregationConfig)
  aggregations!: AggregationConfig[];
}

export class CustomConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => PostgresConfig)
  db!: PostgresConfig;

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
  @Type(() => WsAuthConfig)
  auth!: WsAuthConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => ScatterGatherConfig)
  scatterGather!: ScatterGatherConfig;
}
