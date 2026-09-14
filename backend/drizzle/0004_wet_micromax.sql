CREATE TABLE "part_manuals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"part_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"file_url" varchar(2048) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"part_number" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "part_manuals" ADD CONSTRAINT "part_manuals_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "part_pdfs_part_id_idx" ON "part_manuals" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "parts_project_id_idx" ON "parts" USING btree ("project_id");