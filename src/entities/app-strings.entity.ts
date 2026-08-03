import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sdui_app_strings')
@Unique(['appId', 'locale'])
export class AppStrings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_id', type: 'varchar', length: 32 })
  appId: string;

  /** 'en' | 'ar' */
  @Column({ type: 'varchar', length: 8 })
  locale: string;

  @Column({ type: 'jsonb', default: {} })
  strings: Record<string, string>;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
