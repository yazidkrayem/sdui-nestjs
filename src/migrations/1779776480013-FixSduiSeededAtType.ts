import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 12 created seeded_at as TIMESTAMPTZ, but all other timestamp
 * columns on sdui_screens (created_at, updated_at) are plain TIMESTAMP.
 * Using TIMESTAMPTZ caused a PostgreSQL 42P08 ambiguous-parameter error when
 * the seed script passed the same $N placeholder for both column types.
 * This migration converts the column to TIMESTAMP for consistency.
 */
export class FixSduiSeededAtType1779776480013 implements MigrationInterface {
  name = 'FixSduiSeededAtType1779776480013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sdui_screens
        ALTER COLUMN seeded_at TYPE TIMESTAMP
          USING seeded_at::TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sdui_screens
        ALTER COLUMN seeded_at TYPE TIMESTAMPTZ
          USING seeded_at::TIMESTAMPTZ
    `);
  }
}
