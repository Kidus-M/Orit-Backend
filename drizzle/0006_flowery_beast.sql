CREATE TABLE "monthly_summary_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_month" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"recipient_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary_rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"code_encrypted" text NOT NULL,
	"created_by_admin_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "vendor_invitations" (
  "code_hash",
  "code_encrypted",
  "created_by_admin_id"
)
SELECT
  hash_setting."value",
  encrypted_setting."value",
  hash_setting."updated_by_user_id"
FROM "app_settings" AS hash_setting
INNER JOIN "app_settings" AS encrypted_setting
  ON encrypted_setting."key" = 'vendor_access_code_encrypted'
WHERE hash_setting."key" = 'vendor_access_code_hash'
LIMIT 1;
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vendor_invitation_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_summary_report_month_unique" ON "monthly_summary_deliveries" USING btree ("report_month");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_invitations_active_code_unique" ON "vendor_invitations" USING btree ("code_hash") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "vendor_invitations_created_idx" ON "vendor_invitations" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_vendor_invitation_id_vendor_invitations_id_fk" FOREIGN KEY ("vendor_invitation_id") REFERENCES "public"."vendor_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "locations_vendor_idx" ON "locations" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_vendor_invitation_unique" ON "users" USING btree ("vendor_invitation_id");