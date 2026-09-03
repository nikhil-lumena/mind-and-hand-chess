import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function isUsableEnv(value: string | undefined): boolean {
  return !!value && value !== '[SENSITIVE]' && !value.startsWith('your-');
}

export function hasRedisConfig(): boolean {
  return (
    isUsableEnv(process.env.UPSTASH_REDIS_REST_URL) &&
    isUsableEnv(process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!hasRedisConfig()) {
      throw new Error(
        'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables',
      );
    }
    redis = new Redis({ url: url!, token: token! });
  }
  return redis;
}
