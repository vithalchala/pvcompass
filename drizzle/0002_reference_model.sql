CREATE TYPE "public"."ref_check_status" AS ENUM('draft', 'approved', 'retired');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('approve', 'reject', 'edit', 'retire', 'reopen');--> statement-breakpoint
CREATE TABLE "check_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_id" text NOT NULL,
	"version" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"decision" "review_decision" NOT NULL,
	"comment" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_versions" (
	"check_id" text NOT NULL,
	"version" integer NOT NULL,
	"statement" text NOT NULL,
	"applicability" jsonb,
	"inspector_evidence" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_versions_check_id_version_pk" PRIMARY KEY("check_id","version")
);
--> statement-breakpoint
CREATE TABLE "crosswalks" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_id" text NOT NULL,
	"regulation_id" text,
	"citation_text" text NOT NULL,
	"jurisdiction" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_checks" (
	"check_id" text PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"subarea_code" text NOT NULL,
	"statement" text NOT NULL,
	"applicability" jsonb,
	"inspector_evidence" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "ref_check_status" DEFAULT 'draft' NOT NULL,
	"drafted_by" text,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "check_regulations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "check_regulations" CASCADE;--> statement-breakpoint
DROP TABLE "checks" CASCADE;--> statement-breakpoint
ALTER TABLE "sub_areas" DROP CONSTRAINT "sub_areas_area_code_areas_code_fk";
--> statement-breakpoint
-- The illustrative starter areas are replaced by the frozen reference model; the seed reloads them.
DELETE FROM "sub_areas";--> statement-breakpoint
DELETE FROM "areas";--> statement-breakpoint
ALTER TABLE "sub_areas" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "sub_areas" ADD COLUMN "code" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "check_reviews" ADD CONSTRAINT "check_reviews_check_id_ref_checks_check_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."ref_checks"("check_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_reviews" ADD CONSTRAINT "check_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_versions" ADD CONSTRAINT "check_versions_check_id_ref_checks_check_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."ref_checks"("check_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosswalks" ADD CONSTRAINT "crosswalks_check_id_ref_checks_check_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."ref_checks"("check_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosswalks" ADD CONSTRAINT "crosswalks_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref_checks" ADD CONSTRAINT "ref_checks_subarea_code_sub_areas_code_fk" FOREIGN KEY ("subarea_code") REFERENCES "public"."sub_areas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref_checks" ADD CONSTRAINT "ref_checks_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_areas" ADD CONSTRAINT "sub_areas_area_code_areas_code_fk" FOREIGN KEY ("area_code") REFERENCES "public"."areas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."check_status";