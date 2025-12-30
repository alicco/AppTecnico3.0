import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

let redis: Redis | null = null;

if (redisUrl) {
    redis = new Redis(redisUrl);
}

export default redis;
