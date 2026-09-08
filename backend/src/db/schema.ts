import { boolean, index, pgTable, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),

  // Google OAuth
  googleId: varchar("google_id", { length: 255 }).notNull().unique(),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  emailVerified: boolean("email_verified").notNull().default(false),

  username: varchar("username", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 70 }).notNull(), // removed .unique() — see note below
  email: varchar("email", { length: 254 }).notNull().unique(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionTable = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),

  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  ipAddress: varchar("ip_address", { length: 45 }), // 45 = max IPv6 length
  userAgent: varchar("user_agent", { length: 512 }),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
}));


export const project = pgTable("projects", {

  id: uuid("id").primaryKey().default(sql`uuidv7()`),

});