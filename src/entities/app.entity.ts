import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sdui_apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** URL-safe slug, 3–32 chars, immutable after creation. Pattern: /^[a-z0-9-]{3,32}$/ */
  @Column({ name: 'app_id', type: 'varchar', length: 32, unique: true })
  appId: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string | null;

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  primaryColor: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'suspended' | 'archived';

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
