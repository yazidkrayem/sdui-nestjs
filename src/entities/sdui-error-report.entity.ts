import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sdui_error_reports')
@Index(['appId', 'slug'])
@Index(['appId', 'errorHash'])
export class SduiErrorReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_id', length: 64 })
  appId: string;

  @Column({ length: 64 })
  slug: string;

  @Column({ name: 'node_id', type: 'varchar', length: 64, nullable: true })
  nodeId: string | null;

  @Column({ type: 'text' })
  error: string;

  // Unsigned 32-bit hash of the error string — used for deduplication.
  @Column({ name: 'error_hash', length: 12 })
  errorHash: string;

  @Column({ name: 'schema_version', type: 'int', nullable: true })
  schemaVersion: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  platform: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 32, nullable: true })
  appVersion: string | null;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({
    name: 'last_seen_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
