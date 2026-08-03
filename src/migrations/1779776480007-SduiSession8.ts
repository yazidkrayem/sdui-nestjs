import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiSession81779776480007 implements MigrationInterface {
  name = 'SduiSession81779776480007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Create sdui_app_strings table ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sdui_app_strings" (
        "id"         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "app_id"     varchar(32)  NOT NULL,
        "locale"     varchar(8)   NOT NULL,
        "strings"    jsonb        NOT NULL DEFAULT '{}',
        "updated_by" varchar      NULL,
        "updated_at" timestamptz  NOT NULL DEFAULT now(),
        "created_at" timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "uq_sdui_app_strings_app_locale" UNIQUE ("app_id", "locale")
      )
    `);

    // Seed empty EN + AR rows for the existing 'bidflow' app
    await queryRunner.query(`
      INSERT INTO "sdui_app_strings" ("app_id", "locale", "strings")
      VALUES
        ('bidflow', 'en', '{}'),
        ('bidflow', 'ar', '{}')
      ON CONFLICT ("app_id", "locale") DO NOTHING
    `);

    // ── 2. Performance indexes on sdui_screens ────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sdui_screens_app_id_status"
        ON "sdui_screens" ("app_id", "status")
        WHERE "deleted_at" IS NULL
    `);

    // ── 3. Performance index on sdui_screen_versions ──────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sdui_screen_versions_screen_id_saved_at"
        ON "sdui_screen_versions" ("screen_id", "saved_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sdui_screen_versions_screen_id_saved_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sdui_screens_app_id_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sdui_app_strings"`);
  }
}
