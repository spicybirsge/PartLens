-- Keep signup/profile edits from racing with normalization during migration.
LOCK TABLE "users" IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" GROUP BY lower("username") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Case-insensitive username conflicts exist. Rename conflicting users before retrying this migration.';
  END IF;
END $$;
--> statement-breakpoint
UPDATE "users" SET "username" = lower("username"), "updated_at" = now()
WHERE "username" <> lower("username");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_lowercase" CHECK ("users"."username" = lower("users"."username"));
