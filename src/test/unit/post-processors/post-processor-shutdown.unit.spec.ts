import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Module } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { Test, type TestingModule } from '@nestjs/testing';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import {
  GLOBAL_REDIS_PROVIDER,
  GlobalRedisModule,
} from '../../../post-processors/global-redis.module.js';
import { PostProcessorRegistry } from '../../../post-processors/post-processor-registry.service.js';
import { PostProcessorsModule } from '../../../post-processors/post-processors.module.js';
import {
  BatchGate,
  GatedPostProcessorMock,
} from '../../helpers/mocks/gated-post-processor.mock.js';
import { RecordingRedisProviderMock } from '../../helpers/mocks/recording-redis-provider.mock.js';

const PROBE_OPTIONS: PostProcessorOptions = {
  streamName: 'stream:shutdown-probe',
  groupName: 'ws-service',
  consumerName: 'shutdown-probe',
  blockMs: 10,
  claimIntervalMs: 60000,
  idempotencyTtlSeconds: 0,
};

const waitUntil = async (condition: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 200 && !condition(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(condition()).toBe(true);
};

describe('Post-processors shutdown (Unit)', () => {
  let moduleRef: TestingModule | null = null;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = null;
    jest.restoreAllMocks();
  });

  /**
   * Same layout as PostProcessorsModule: the registry and the post-processors live in a
   * module that imports GlobalRedisModule.
   */
  const compileProbe = async (
    journal: string[],
    gate: BatchGate,
  ): Promise<{ moduleRef: TestingModule; redis: RecordingRedisProviderMock }> => {
    const redis = new RecordingRedisProviderMock(journal);

    @Module({
      imports: [GlobalRedisModule],
      providers: [
        PostProcessorRegistry,
        {
          provide: GatedPostProcessorMock,
          useFactory: async (
            redisProvider: RecordingRedisProviderMock,
            registry: PostProcessorRegistry,
          ) => {
            await redisProvider.connect();
            return registry.launch(
              PROBE_OPTIONS,
              (options) =>
                new GatedPostProcessorMock(redisProvider.getDriver(), options, gate, journal),
            );
          },
          inject: [GLOBAL_REDIS_PROVIDER, PostProcessorRegistry],
        },
      ],
    })
    class ShutdownProbeModule {}

    const compiled = await Test.createTestingModule({ imports: [ShutdownProbeModule] })
      .overrideProvider(GLOBAL_REDIS_PROVIDER)
      .useValue(redis)
      .compile();
    await compiled.init();
    return { moduleRef: compiled, redis };
  };

  it('acknowledges the batch in flight before the global Redis client disconnects', async () => {
    const journal: string[] = [];
    const gate = new BatchGate();
    ({ moduleRef } = await compileProbe(journal, gate));
    await waitUntil(() => journal.includes('batch-started'));

    const closing = moduleRef.close();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(journal).not.toContain('redis-disconnect');

    gate.release();
    await closing;
    moduleRef = null;

    expect(journal).toEqual(['batch-started', 'XACK', 'redis-disconnect']);
  });

  it('builds the post-processors without per-instance signal listeners', async () => {
    const sigtermBefore = process.listenerCount('SIGTERM');
    const sigintBefore = process.listenerCount('SIGINT');
    const journal: string[] = [];
    const gate = new BatchGate();
    gate.release();

    ({ moduleRef } = await compileProbe(journal, gate));
    await waitUntil(() => journal.includes('batch-started'));

    expect(moduleRef.get(PostProcessorRegistry).count()).toBe(1);
    expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
    expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
  });

  it('wires PostProcessorsModule with the registry and the imported GlobalRedisModule', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, PostProcessorsModule) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PostProcessorsModule,
    ) as unknown[];
    const provides = providers.map((provider) =>
      typeof provider === 'object' && provider !== null && 'provide' in provider
        ? provider.provide
        : provider,
    );

    expect(imports).toContain(GlobalRedisModule);
    expect(provides).toContain(PostProcessorRegistry);
    expect(provides).not.toContain(GLOBAL_REDIS_PROVIDER);
  });
});
