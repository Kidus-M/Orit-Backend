ALTER TABLE "inventory_events" ADD COLUMN "stock_quantity" integer;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "stock_quantity" integer DEFAULT 24 NOT NULL;
--> statement-breakpoint
UPDATE "locations" SET "in_stock" = ("stock_quantity" > 0);
