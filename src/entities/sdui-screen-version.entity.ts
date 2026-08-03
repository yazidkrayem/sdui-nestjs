import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SduiScreen } from './sdui-screen.entity';

@Entity('sdui_screen_versions')
@Index(['screenId', 'savedAt'])
export class SduiScreenVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'screen_id', type: 'uuid' })
  screenId: string;

  /** Denormalized from SduiScreen for efficient per-app queries. */
  @Column({ name: 'app_id', type: 'varchar', length: 32 })
  appId: string;

  @ManyToOne(() => SduiScreen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screen_id' })
  screen: SduiScreen;

  @Column({ type: 'jsonb' })
  descriptor: Record<string, unknown>;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ name: 'saved_by', type: 'uuid' })
  savedBy: string;

  @CreateDateColumn({ name: 'saved_at', type: 'timestamp' })
  savedAt: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;
}
