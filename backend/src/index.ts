
import express from "express";
import logger from "morgan"
import cors from "cors"
import errorHandler from "./middleware/errorHandler.js";
import isAdminRequest from "./middleware/isAdminRequest.js";

import authRoutes from "./routes/v1/auth.js"
import createRoutes from "./routes/v1/create.js"
import deleteRoutes from "./routes/v1/delete.js"
import readRoutes from "./routes/v1/read.js"
import updateRoutes from "./routes/v1/update.js"



import { initializeDatabase, database } from "./db/index.js"
import redisClient from "./redis/redisClient.js"
import { sql } from 'drizzle-orm';

await initializeDatabase();
await redisClient.connect();



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger('combined'));
app.use(cors());
app.set('json spaces', 1)

//below edit or remove config based on decided deployment
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true);
}




app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/create', createRoutes);
app.use('/api/v1/delete', deleteRoutes);
app.use('/api/v1/read', readRoutes);
app.use('/api/v1/update', updateRoutes);



app.get('/status', isAdminRequest, async (req, res) => {
    let services = {
        postgres: "up",
        redis: "up"
    };

    let healthy = true;

    try {
        await database.execute(sql`SELECT 1`);
    } catch {
        healthy = false;
        services.postgres = "down";
    }

    try {
        const pong = await redisClient.ping();
        if (pong !== "PONG") {
            healthy = false;
            services.redis = "down";
        }
    } catch {
        healthy = false;
        services.redis = "down";
    }

    const response: any = {
        success: healthy,
        message: healthy
            ? "All systems operational"
            : "Some/all systems are not operational or unavailable",
        healthy,
        code: healthy ? 200 : 503
    };

    if (req.isAdmin) {
        response.services = services;
    }

    return res.status(response.code).json(response);
});

app.use((req, res, next) => {
    res.status(404).json({ success: false, message: "No matching route found.", code: 404 })
})



app.use(errorHandler);



const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`[^] Server is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
})




