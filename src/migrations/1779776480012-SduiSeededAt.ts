import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiSeededAt1779776480012 implements MigrationInterface {
  name = 'SduiSeededAt1779776480012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sdui_screens
        ADD COLUMN IF NOT EXISTS seeded_at TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sdui_screens DROP COLUMN IF EXISTS seeded_at
    `);
  }
}
