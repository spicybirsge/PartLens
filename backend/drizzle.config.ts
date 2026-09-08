import dotenv from "dotenv"

if (process.env.NODE_ENV !== 'production') {
    dotenv.config()
}
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
