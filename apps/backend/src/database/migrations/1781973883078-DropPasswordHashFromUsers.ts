import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPasswordHashFromUsers1781973883078 implements MigrationInterface {
  name = 'DropPasswordHashFromUsers1781973883078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying`);
  }
}
