import { MigrationInterface, QueryRunner } from 'typeorm';

export class RedesignSduiScreens1779776480003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sdui_screens`);

    await queryRunner.query(`
      CREATE TABLE sdui_screens (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name           VARCHAR(100) NOT NULL,
        slug           VARCHAR(100) NOT NULL UNIQUE,
        icon           VARCHAR(100),
        sort_order     INT NOT NULL DEFAULT 0,
        visible        BOOLEAN NOT NULL DEFAULT true,
        roles          TEXT[] NOT NULL DEFAULT '{}',
        descriptor     JSONB NOT NULL DEFAULT '{}',
        schema_version INT NOT NULL DEFAULT 1,
        deleted_at     TIMESTAMP,
        deleted_by     UUID,
        created_at     TIMESTAMP NOT NULL DEFAULT now(),
        updated_at     TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_sdui_screens_slug ON sdui_screens (slug) WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sdui_screens`);

    await queryRunner.query(`
      CREATE TABLE sdui_screens (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name         VARCHAR(100) UNIQUE NOT NULL,
        version      INT DEFAULT 1,
        is_published BOOLEAN DEFAULT false,
        config       JSONB NOT NULL,
        updated_by   UUID,
        created_at   TIMESTAMP DEFAULT now(),
        updated_at   TIMESTAMP DEFAULT now()
      )
    `);
  }
}
