CREATE TYPE "public"."check_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "areas" (
	"code" text PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "areas_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "check_regulations" (
	"check_id" integer NOT NULL,
	"regulation_id" text NOT NULL,
	CONSTRAINT "check_regulations_check_id_regulation_id_pk" PRIMARY KEY("check_id","regulation_id")
);
--> statement-breakpoint
CREATE TABLE "checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"sub_area_id" integer NOT NULL,
	"number" integer NOT NULL,
	"question" text NOT NULL,
	"guidance" text NOT NULL,
	"status" "check_status" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "corpus" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"as_of" date NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "regulations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"section" text,
	"summary" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_label" text,
	"as_of" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"area_code" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_regulations" ADD CONSTRAINT "check_regulations_check_id_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_regulations" ADD CONSTRAINT "check_regulations_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checks" ADD CONSTRAINT "checks_sub_area_id_sub_areas_id_fk" FOREIGN KEY ("sub_area_id") REFERENCES "public"."sub_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_areas" ADD CONSTRAINT "sub_areas_area_code_areas_code_fk" FOREIGN KEY ("area_code") REFERENCES "public"."areas"("code") ON DELETE cascade ON UPDATE no action;