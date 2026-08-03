import { MigrationInterface, QueryRunner } from 'typeorm';

export class SduiPublishingAndVersions1779776480004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status enum + publishing columns to sdui_screens
    await queryRunner.query(`
      CREATE TYPE sdui_screen_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')
    `);

    await queryRunner.query(`
      ALTER TABLE sdui_screens
        ADD COLUMN status        sdui_screen_status NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN published_at  TIMESTAMP,
        ADD COLUMN published_by  UUID
    `);

    await queryRunner.query(
      `CREATE INDEX idx_sdui_screens_status ON sdui_screens (status) WHERE deleted_at IS NULL`,
    );

    // Create version history table
    await queryRunner.query(`
      CREATE TABLE sdui_screen_versions (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        screen_id      UUID NOT NULL REFERENCES sdui_screens(id) ON DELETE CASCADE,
        descriptor     JSONB NOT NULL,
        schema_version INT NOT NULL DEFAULT 1,
        saved_by       UUID NOT NULL,
        saved_at       TIMESTAMP NOT NULL DEFAULT now(),
        label          VARCHAR(200),
        is_active      BOOLEAN NOT NULL DEFAULT false
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_sdui_screen_versions_screen ON sdui_screen_versions (screen_id, saved_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sdui_screen_versions`);
    await queryRunner.query(
      `ALTER TABLE sdui_screens DROP COLUMN IF EXISTS published_by`,
    );
    await queryRunner.query(
      `ALTER TABLE sdui_screens DROP COLUMN IF EXISTS published_at`,
    );
    await queryRunner.query(
      `ALTER TABLE sdui_screens DROP COLUMN IF EXISTS status`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS sdui_screen_status`);
  }
}
