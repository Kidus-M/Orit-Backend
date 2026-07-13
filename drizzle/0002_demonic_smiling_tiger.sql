CREATE TABLE "auth_access_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hash" text NOT NULL,
	"ip_hash" text NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_attempts_email_created_idx" ON "auth_access_attempts" USING btree ("email_hash","created_at");--> statement-breakpoint
CREATE INDEX "auth_attempts_email_ip_created_idx" ON "auth_access_attempts" USING btree ("email_hash","ip_hash","created_at");