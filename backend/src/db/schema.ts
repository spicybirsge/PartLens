import { boolean, index, pgTable, timestamp, varchar, uuid, integer } from "drizzle-orm/pg-core";
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
  lastActive: timestamp("last_active", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),

}));


export const projectTable = pgTable("projects", {

  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  publicId: varchar("public_id", { length: 21 }).notNull(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  glbFileUrl: varchar("glb_file_url", { length: 2048 }).notNull(),
  unlisted: boolean("unlisted").notNull().default(true),
 
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),


}, (table) => ({
  userIdIdx: index("projects_user_id_idx").on(table.userId),
  unlistedIdx: index("projects_unlisted_idx").on(table.unlisted)
}));

//create a seperate table for project Views with user ip  views: integer("views").notNull(),


export const partsTable = pgTable("parts", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  projectId: uuid("project_id").notNull().references(() => projectTable.id, { onDelete: "cascade" }),
  partNumber: varchar("part_number", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

}, (table) => ({
  projectIdIdx: index("parts_project_id_idx").on(table.projectId),
}))

export const partManualsTable = pgTable("part_manuals", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  partId: uuid("part_id").notNull().references(() => partsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 2048 }).notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  partIdIdx: index("part_pdfs_part_id_idx").on(table.partId),
}));