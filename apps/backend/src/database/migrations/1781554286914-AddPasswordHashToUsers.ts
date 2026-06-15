import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashToUsers1781554286914 implements MigrationInterface {
  name = 'AddPasswordHashToUsers1781554286914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
  }
}
