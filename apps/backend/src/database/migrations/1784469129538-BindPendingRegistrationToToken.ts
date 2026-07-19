import { MigrationInterface, QueryRunner } from 'typeorm';

export class BindPendingRegistrationToToken1784469129538 implements MigrationInterface {
  name = 'BindPendingRegistrationToToken1784469129538';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "pending_registrations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ee0dba4c34b22d1bce194e75ab"`);
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ADD "tokenHash" character varying NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee0dba4c34b22d1bce194e75ab" ON "pending_registrations"  ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_595e83488a032e8b42082c3d81" ON "pending_registrations"  ("tokenHash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_595e83488a032e8b42082c3d81"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ee0dba4c34b22d1bce194e75ab"`);
    await queryRunner.query(`ALTER TABLE "pending_registrations" DROP COLUMN "tokenHash"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ee0dba4c34b22d1bce194e75ab" ON "pending_registrations" USING btree ("email") `,
    );
  }
}
