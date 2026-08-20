CREATE TABLE "scientific_figure_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"background_prompt" text NOT NULL,
	"stage_labels" jsonb NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"status" varchar DEFAULT 'queued' NOT NULL,
	"background_key" text,
	"scene_key" text,
	"svg_key" text,
	"preview_key" text,
	"bundle_key" text,
	"element_count" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "scientific_figure_job" ADD CONSTRAINT "scientific_figure_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scientificFigureJob_user_created_idx" ON "scientific_figure_job" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scientificFigureJob_status_updated_idx" ON "scientific_figure_job" USING btree ("status","updated_at");