ALTER TABLE "locations" ADD COLUMN "abc_license_type" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "abc_license_number" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "responsible_operator" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "compliance_approved" boolean DEFAULT false NOT NULL;