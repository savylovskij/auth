import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingRegistrations1783870977128 implements MigrationInterface {
  name = 'AddPendingRegistrations1783870977128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pending_registrations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "codeHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_72a24749ddb2c32bd41c3380909" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ee0dba4c34b22d1bce194e75ab" ON "pending_registrations"  ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_ee0dba4c34b22d1bce194e75ab"`);
    await queryRunner.query(`DROP TABLE "pending_registrations"`);
  }
}
