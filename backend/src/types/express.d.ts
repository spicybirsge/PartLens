import * as express from 'express';
import type { sessionTable, usersTable } from "../db/schema.js";

type AuthUser = Pick<
  typeof usersTable.$inferSelect,
  "id" | "username" | "name" | "email" | "avatarUrl" | "createdAt" | "updatedAt"
>;
type AuthSession = typeof sessionTable.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
      user?: AuthUser;
      session?: AuthSession;
    }
  }
}