import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentities1781974106061 implements MigrationInterface {
  name = 'CreateIdentities1781974106061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "identities" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "provider" character varying NOT NULL, "providerId" character varying NOT NULL, "passwordHash" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b2f8cccf4ac6a2d7e6e9e8b1f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3144d31adb77f8fdd5aecf28f4" ON "identities"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b87d768dfb8e86b7b2150001eb" ON "identities"  ("provider", "providerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "identities" ADD CONSTRAINT "FK_3144d31adb77f8fdd5aecf28f4a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "identities" DROP CONSTRAINT "FK_3144d31adb77f8fdd5aecf28f4a"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_b87d768dfb8e86b7b2150001eb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3144d31adb77f8fdd5aecf28f4"`);
    await queryRunner.query(`DROP TABLE "identities"`);
  }
}
