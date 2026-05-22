import { BaseConfig, RedisConfig } from '@volontariapp/config';
import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';

export class CustomConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;
}
