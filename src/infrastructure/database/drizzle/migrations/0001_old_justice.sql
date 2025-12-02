CREATE INDEX "abis_is_deleted_idx" ON "abis" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "abis_user_not_deleted_idx" ON "abis" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "abis_contract_name_idx" ON "abis" USING btree ("contract_name");--> statement-breakpoint
CREATE INDEX "abis_standard_not_deleted_idx" ON "abis" USING btree ("standard","is_deleted");--> statement-breakpoint
CREATE INDEX "contracts_network_id_idx" ON "contracts" USING btree ("network_id");--> statement-breakpoint
CREATE INDEX "contracts_is_verified_idx" ON "contracts" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "contracts_network_verified_idx" ON "contracts" USING btree ("network_id","is_verified");--> statement-breakpoint
CREATE INDEX "contracts_type_idx" ON "contracts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "contracts_name_idx" ON "contracts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "contracts_network_type_idx" ON "contracts" USING btree ("network_id","type");--> statement-breakpoint
CREATE INDEX "audit_logs_method_path_idx" ON "audit_logs" USING btree ("method","path");--> statement-breakpoint
CREATE INDEX "audit_logs_user_created_at_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");