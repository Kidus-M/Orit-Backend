CREATE TABLE "vendor_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"case_price_cents" integer NOT NULL,
	"transportation_fee_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmation_token_hash" text NOT NULL,
	"confirmation_expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "case_price_cents" integer DEFAULT 8500 NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "transportation_fee_cents" integer DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "vendor_order_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_vendor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendor_orders_vendor_idx" ON "vendor_orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_orders_status_created_idx" ON "vendor_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_orders_confirmation_token_unique" ON "vendor_orders" USING btree ("confirmation_token_hash");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_vendor_order_idx" ON "payments" USING btree ("vendor_order_id");