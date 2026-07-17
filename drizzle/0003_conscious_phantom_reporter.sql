CREATE TABLE "concerns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "membership_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concerns_status_created_idx" ON "concerns" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "concerns_member_created_idx" ON "concerns" USING btree ("member_id","created_at");