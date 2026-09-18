CREATE TABLE "project_views" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"ip" varchar(45) NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_views_project_id_idx" ON "project_views" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_views_project_id_ip_unique" ON "project_views" USING btree ("project_id","ip");