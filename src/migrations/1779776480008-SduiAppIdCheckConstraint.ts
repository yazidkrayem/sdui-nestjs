import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiAppIdCheckConstraint1779776480008 implements MigrationInterface {
  name = 'SduiAppIdCheckConstraint1779776480008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enforce lowercase slug format: 3-32 chars, letters/digits/hyphens only.
    await queryRunner.query(`
      ALTER TABLE "sdui_apps"
      ADD CONSTRAINT "chk_sdui_apps_app_id_format"
      CHECK ("app_id" ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sdui_apps"
      DROP CONSTRAINT "chk_sdui_apps_app_id_format"
    `);
  }
}
