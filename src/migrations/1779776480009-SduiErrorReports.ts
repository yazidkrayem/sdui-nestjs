import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiErrorReports1779776480009 implements MigrationInterface {
  name = 'SduiErrorReports1779776480009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sdui_error_reports" (
        "id"             UUID            NOT NULL DEFAULT uuid_generate_v4(),
        "app_id"         VARCHAR(64)     NOT NULL,
        "slug"           VARCHAR(64)     NOT NULL,
        "node_id"        VARCHAR(64),
        "error"          TEXT            NOT NULL,
        "error_hash"     VARCHAR(12)     NOT NULL,
        "schema_version" INTEGER,
        "platform"       VARCHAR(32),
        "app_version"    VARCHAR(32),
        "count"          INTEGER         NOT NULL DEFAULT 1,
        "last_seen_at"   TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at"     TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"     TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_sdui_error_reports" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sdui_error_reports_app_slug"
        ON "sdui_error_reports" ("app_id", "slug")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sdui_error_reports_hash"
        ON "sdui_error_reports" ("app_id", "error_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sdui_error_reports"`);
  }
}
