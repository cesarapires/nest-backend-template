import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndSessions1791220666405 implements MigrationInterface {

  public name = 'CreateUsersAndSessions1791220666405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "email" character varying(254) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'USER', "email_verified_at" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_848b8b23bf0748243d4e1e76ae3" UNIQUE ("public_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fee1c1542b932e5148f464ba3c" ON "users"  ("email") WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE TABLE "session" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "refresh_token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "user_agent" character varying(255), "ip" character varying(45), "user_id" bigint NOT NULL, CONSTRAINT "UQ_9aae0f4c9ea25a1e21957139d15" UNIQUE ("public_id"), CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_30e98e8746699fb9af235410af" ON "session"  ("user_id") `);
    await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_30e98e8746699fb9af235410aff" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_30e98e8746699fb9af235410aff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_30e98e8746699fb9af235410af"`);
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fee1c1542b932e5148f464ba3c"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
