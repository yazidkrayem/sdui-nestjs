import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SduiScreenStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('sdui_screens')
@Index(['appId', 'slug'], { unique: true })
export class SduiScreen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Owning app identifier — scopes all queries. Immutable after creation. */
  @Column({ name: 'app_id', type: 'varchar', length: 32 })
  appId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @Column({ type: 'text', array: true, default: [] })
  roles: string[];

  @Column({ type: 'jsonb', default: {} })
  descriptor: Record<string, unknown>;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion: number;

  @Column({
    type: 'enum',
    enum: SduiScreenStatus,
    default: SduiScreenStatus.DRAFT,
  })
  status: SduiScreenStatus;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy: string | null;

  /** Whether this screen requires user authentication to view (checked client-side). */
  @Column({ name: 'auth_required', type: 'boolean', default: false })
  authRequired: boolean;

  /** Whether this is a pre-authentication screen (login/register/etc.) that authenticated users should be redirected away from. */
  @Column({ name: 'pre_auth', type: 'boolean', default: false })
  preAuth: boolean;

  /** App-user roles allowed to view this screen; empty = all authenticated users. */
  @Column({
    name: 'redirect_if_unauth',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  redirectIfUnauth: string | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  /**
   * Set to the timestamp of the most recent seed run.
   * The seed only overwrites this screen when updatedAt == seededAt,
   * meaning no manual edits have been made after the last seed.
   */
  @Column({ name: 'seeded_at', type: 'timestamp', nullable: true })
  seededAt: Date | null;
}
