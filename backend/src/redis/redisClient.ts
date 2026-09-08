import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL,
})

redisClient.on('error', (err) => console.error('[!] Redis database error:', err));
redisClient.on('connect', () => console.log('[^] Connected to redis database'));


export default redisClient;