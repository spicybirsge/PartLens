import * as express from 'express';
type AuthUser = Pick<
  typeof usersTable.$inferSelect,
  "id" | "username" | "name" | "email" | "avatarUrl" | "createdAt" | "updatedAt"
>;
declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
      user?: AuthUser
    }
  }
}