import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiSession71779776480006 implements MigrationInterface {
  name = 'SduiSession71779776480006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Create sdui_apps table ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sdui_apps" (
        "id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "app_id"        varchar(32)  NOT NULL,
        "name"          varchar(64)  NOT NULL,
        "description"   varchar(255) NULL,
        "icon_url"      varchar      NULL,
        "primary_color" varchar(20)  NULL,
        "status"        varchar(20)  NOT NULL DEFAULT 'active',
        "created_by"    uuid         NULL,
        "created_at"    timestamptz  NOT NULL DEFAULT now(),
        "updated_at"    timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"    timestamptz  NULL,
        CONSTRAINT "uq_sdui_apps_app_id" UNIQUE ("app_id")
      )
    `);

    // Seed the first app
    await queryRunner.query(`
      INSERT INTO "sdui_apps" ("app_id","name","description","status")
      VALUES ('bidflow','BidFlow','Luxury auction platform','active')
      ON CONFLICT ("app_id") DO NOTHING
    `);

    // ── 2. sdui_screens: add app_id ───────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "sdui_screens"
        ADD COLUMN IF NOT EXISTS "app_id" varchar(32) NULL
    `);
    // Data migration: set all existing rows to 'bidflow'
    await queryRunner.query(`
      UPDATE "sdui_screens" SET "app_id" = 'bidflow' WHERE "app_id" IS NULL
    `);
    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "sdui_screens"
        ALTER COLUMN "app_id" SET NOT NULL
    `);
    // Drop old unique constraint on slug alone
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sdui_screens_slug"
    `);
    await queryRunner.query(`
      ALTER TABLE "sdui_screens"
        DROP CONSTRAINT IF EXISTS "UQ_sdui_screens_slug",
        DROP CONSTRAINT IF EXISTS "sdui_screens_slug_key"
    `);
    // Add composite unique index (app_id, slug)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sdui_screens_app_id_slug"
        ON "sdui_screens" ("app_id", "slug")
        WHERE "deleted_at" IS NULL
    `);

    // ── 3. sdui_screen_versions: add app_id ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "sdui_screen_versions"
        ADD COLUMN IF NOT EXISTS "app_id" varchar(32) NULL
    `);
    await queryRunner.query(`
      UPDATE "sdui_screen_versions" v
      SET "app_id" = (
        SELECT s."app_id" FROM "sdui_screens" s WHERE s."id" = v."screen_id"
      )
      WHERE v."app_id" IS NULL
    `);
    // Only set NOT NULL after all rows have been populated
    await queryRunner.query(`
      UPDATE "sdui_screen_versions" SET "app_id" = 'bidflow' WHERE "app_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sdui_screen_versions"
        ALTER COLUMN "app_id" SET NOT NULL
    `);

    // ── 4. sdui_nav_config: add app_id ───────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "sdui_nav_config"
        ADD COLUMN IF NOT EXISTS "app_id" varchar(32) NULL
    `);
    await queryRunner.query(`
      UPDATE "sdui_nav_config" SET "app_id" = 'bidflow' WHERE "app_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sdui_nav_config"
        ALTER COLUMN "app_id" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sdui_nav_config_app_id"
        ON "sdui_nav_config" ("app_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_sdui_nav_config_app_id"`);
    await queryRunner.query(`
      ALTER TABLE "sdui_nav_config"
        DROP COLUMN IF EXISTS "app_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "sdui_screen_versions"
        DROP COLUMN IF EXISTS "app_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sdui_screens_app_id_slug"
    `);
    await queryRunner.query(`
      ALTER TABLE "sdui_screens"
        DROP COLUMN IF EXISTS "app_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "sdui_apps"`);
  }
}
