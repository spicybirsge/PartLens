CREATE TABLE "part_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "part_bookmarks" ADD CONSTRAINT "part_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_bookmarks" ADD CONSTRAINT "part_bookmarks_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "part_bookmarks_user_id_idx" ON "part_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "part_bookmarks_user_id_part_id_unique" ON "part_bookmarks" USING btree ("user_id","part_id");--> statement-breakpoint
CREATE INDEX "project_bookmarks_user_id_idx" ON "project_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_bookmarks_user_id_project_id_unique" ON "project_bookmarks" USING btree ("user_id","project_id");