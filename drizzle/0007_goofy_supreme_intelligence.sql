ALTER TABLE "orders" ADD COLUMN "order_type" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "event_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "transportation_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_ready_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "orders_type_created_idx" ON "orders" USING btree ("order_type","created_at");