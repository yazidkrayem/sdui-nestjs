import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiSession61779776480005 implements MigrationInterface {
  name = 'SduiSession61779776480005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── sdui_screens: auth per screen ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "sdui_screens"
        ADD COLUMN IF NOT EXISTS "auth_required" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "redirect_if_unauth" varchar(200) NULL
    `);

    // ── sdui_nav_config (singleton nav config) ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sdui_nav_config" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nav_type"            varchar(20)  NOT NULL DEFAULT 'bottomNav',
        "bottom_nav"          jsonb        NULL,
        "drawer"              jsonb        NULL,
        "tab_bar"             jsonb        NULL,
        "initial_route"       varchar(200) NOT NULL DEFAULT 'home',
        "auth_redirect"       varchar(200) NOT NULL DEFAULT 'login',
        "post_login_redirect" varchar(200) NULL,
        "updated_by"          uuid         NULL,
        "updated_at"          timestamptz  NOT NULL DEFAULT now(),
        "created_at"          timestamptz  NOT NULL DEFAULT now()
      )
    `);

    // Seed default row so service never returns 404 on first boot
    await queryRunner.query(`
      INSERT INTO "sdui_nav_config"
        ("nav_type","initial_route","auth_redirect","bottom_nav")
      SELECT
        'bottomNav', 'home', 'login',
        '{"backgroundColor":"#FFFFFF","activeColor":"#3B82F6","inactiveColor":"#9CA3AF","fontSize":12,"fontWeight":"500","iconSize":24,"showLabels":true,"items":[]}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM "sdui_nav_config")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sdui_nav_config"`);
    await queryRunner.query(`
      ALTER TABLE "sdui_screens"
        DROP COLUMN IF EXISTS "auth_required",
        DROP COLUMN IF EXISTS "redirect_if_unauth"
    `);
  }
}
