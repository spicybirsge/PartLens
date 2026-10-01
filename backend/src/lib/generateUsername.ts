import { customAlphabet } from "nanoid";

export const generateUsername = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789_-", 21);
