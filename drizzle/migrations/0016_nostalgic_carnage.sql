CREATE TABLE "paper_download_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"client_request_id" varchar(128) NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"doi" text,
	"amount_fen" integer DEFAULT 100 NOT NULL,
	"status" varchar DEFAULT 'requested' NOT NULL,
	"object_key" text,
	"content_sha256" varchar(64),
	"size_bytes" integer,
	"debit_idempotency_key" varchar(160) NOT NULL,
	"refund_idempotency_key" varchar(160) NOT NULL,
	"failure_code" varchar(64),
	"failure_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"refunded_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "paper_download_order" ADD CONSTRAINT "paper_download_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "paperDownloadOrder_user_request_unique" ON "paper_download_order" USING btree ("user_id","client_request_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "paperDownloadOrder_debit_key_unique" ON "paper_download_order" USING btree ("debit_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "paperDownloadOrder_refund_key_unique" ON "paper_download_order" USING btree ("refund_idempotency_key");
--> statement-breakpoint
CREATE INDEX "paperDownloadOrder_user_created_idx" ON "paper_download_order" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "paperDownloadOrder_status_updated_idx" ON "paper_download_order" USING btree ("status","updated_at");
