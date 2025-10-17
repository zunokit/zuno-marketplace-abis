CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"rate_limit_enabled" boolean DEFAULT false,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"refill_amount" integer,
	"refill_interval" integer,
	"last_refill_at" timestamp,
	"last_request" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"permissions" text,
	"metadata" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "api_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "networks" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_testnet" boolean DEFAULT false NOT NULL,
	"rpc_urls" varchar(500)[] NOT NULL,
	"explorer_urls" varchar(500)[],
	"native_currency" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"icon" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "networks_chain_id_unique" UNIQUE("chain_id"),
	CONSTRAINT "networks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "abi_versions" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"abi_id" varchar(50) NOT NULL,
	"version" varchar(50) NOT NULL,
	"version_number" integer NOT NULL,
	"abi" jsonb NOT NULL,
	"abi_hash" varchar(64) NOT NULL,
	"ipfs_hash" varchar(100),
	"ipfs_url" varchar(500),
	"change_log" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "abi_versions_unique_version" UNIQUE("abi_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "abis" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"contract_name" varchar(255),
	"abi" jsonb NOT NULL,
	"abi_hash" varchar(64) NOT NULL,
	"ipfs_hash" varchar(100),
	"ipfs_url" varchar(500),
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"tags" varchar(50)[] DEFAULT '{}',
	"standard" varchar(50),
	"metadata" jsonb,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "abis_abi_hash_unique" UNIQUE("abi_hash")
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"address" varchar(42) NOT NULL,
	"network_id" varchar(50) NOT NULL,
	"abi_id" varchar(50) NOT NULL,
	"name" varchar(255),
	"type" varchar(50),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verification_source" varchar(50),
	"metadata" jsonb,
	"deployed_at" timestamp,
	"deployer" varchar(42),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_address_network_unique" UNIQUE("address","network_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"api_key_id" text,
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"action" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"resource_type" varchar(50),
	"resource_id" uuid,
	"status_code" integer NOT NULL,
	"duration" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"label" varchar(32) NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"deprecated" boolean DEFAULT false NOT NULL,
	"released_at" timestamp NOT NULL,
	"sunset_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abi_versions" ADD CONSTRAINT "abi_versions_abi_id_abis_id_fk" FOREIGN KEY ("abi_id") REFERENCES "public"."abis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abis" ADD CONSTRAINT "abis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_network_id_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_abi_id_abis_id_fk" FOREIGN KEY ("abi_id") REFERENCES "public"."abis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "networks_chain_id_idx" ON "networks" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "networks_slug_idx" ON "networks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "abi_versions_abi_id_idx" ON "abi_versions" USING btree ("abi_id");--> statement-breakpoint
CREATE INDEX "abi_versions_version_idx" ON "abi_versions" USING btree ("abi_id","version_number");--> statement-breakpoint
CREATE INDEX "abis_user_id_idx" ON "abis" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "abis_abi_hash_idx" ON "abis" USING btree ("abi_hash");--> statement-breakpoint
CREATE INDEX "abis_name_idx" ON "abis" USING btree ("name");--> statement-breakpoint
CREATE INDEX "abis_standard_idx" ON "abis" USING btree ("standard");--> statement-breakpoint
CREATE INDEX "abis_created_at_idx" ON "abis" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contracts_address_network_idx" ON "contracts" USING btree ("address","network_id");--> statement-breakpoint
CREATE INDEX "contracts_abi_id_idx" ON "contracts" USING btree ("abi_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_api_key_id_idx" ON "audit_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");