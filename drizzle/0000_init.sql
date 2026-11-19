CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"seed" integer NOT NULL,
	"sort_score" integer DEFAULT 0 NOT NULL,
	"stack_score" integer DEFAULT 0 NOT NULL,
	"memo_score" integer DEFAULT 0 NOT NULL,
	"sort_done" boolean DEFAULT false NOT NULL,
	"stack_done" boolean DEFAULT false NOT NULL,
	"memo_done" boolean DEFAULT false NOT NULL,
	"sort_started_at" timestamp with time zone,
	"stack_started_at" timestamp with time zone,
	"memo_started_at" timestamp with time zone,
	"flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"total_score" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"department" text NOT NULL,
	"phone" text NOT NULL,
	"invite_code" text NOT NULL,
	"invite_seq" integer NOT NULL,
	"attempts_used" integer DEFAULT 0 NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"best_finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_phone_unique" UNIQUE("phone"),
	CONSTRAINT "registrations_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "registrations_invite_seq_unique" UNIQUE("invite_seq")
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_registration_idx" ON "attempts" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "registrations_best_score_idx" ON "registrations" USING btree ("best_score");