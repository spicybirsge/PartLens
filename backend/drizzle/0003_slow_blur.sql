ALTER TABLE "projects" ADD COLUMN "public_id" varchar(21) NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" varchar(1000);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "glb_file_url" varchar(2048) NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "unlisted" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "views" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_unlisted_idx" ON "projects" USING btree ("unlisted");