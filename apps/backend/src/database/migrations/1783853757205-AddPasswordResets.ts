import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResets1783853757205 implements MigrationInterface {
  name = 'AddPasswordResets1783853757205';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_resets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "codeHash" character varying NOT NULL, "userId" uuid NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4816377aa98211c1de34469e742" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d95569f623f28a0bf034a55099" ON "password_resets"  ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" ADD CONSTRAINT "FK_d95569f623f28a0bf034a55099e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_resets" DROP CONSTRAINT "FK_d95569f623f28a0bf034a55099e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_d95569f623f28a0bf034a55099"`);
    await queryRunner.query(`DROP TABLE "password_resets"`);
  }
}
