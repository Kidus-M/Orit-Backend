CREATE TABLE "pickup_access_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"ip_hash" text NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "service_code_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_token_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pickup_access_attempts" ADD CONSTRAINT "pickup_access_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pickup_attempts_order_ip_created_idx" ON "pickup_access_attempts" USING btree ("order_id","ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_pickup_token_unique" ON "orders" USING btree ("pickup_token_hash");
