import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiPreAuth1779776480010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sdui_screens ADD COLUMN IF NOT EXISTS pre_auth boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sdui_screens DROP COLUMN IF EXISTS pre_auth`,
    );
  }
}
