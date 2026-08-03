import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { LocalizedString } from '../schema/localized-string';

// ── NavItem ───────────────────────────────────────────────────────────────────

/**
 * A single item in a navigation section.
 * `slug` links to SduiScreen.slug; `roles` are app-user roles (buyer/seller/guest).
 */
export interface NavItem {
  id: string;
  slug: string;
  label: LocalizedString;
  icon: string;
  order: number;
  visible: boolean;
  authRequired: boolean;
  roles: string[];
  badge: 'none' | 'notification_count' | 'live_auction_count' | 'cart_count';
}

// ── NavConfig ─────────────────────────────────────────────────────────────────

/**
 * Visual config + item list for a single nav section (bottomNav, drawer, tabBar).
 */
export interface NavConfig {
  backgroundColor: string;
  activeColor: string;
  inactiveColor: string;
  activeIndicatorColor?: string;
  dividerColor?: string;
  headerImageUrl?: string;
  headerTitle?: LocalizedString;
  fontSize: number;
  fontWeight: string;
  iconSize: number;
  showLabels: boolean;
  items: NavItem[];
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * Singleton navigation config for the app.
 * Session 7 will add an `appId` FK to scope this per-tenant.
 */
@Entity('sdui_nav_config')
export class SduiNavConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Which navigation widgets are active in the app. */
  @Column({ name: 'nav_type', type: 'varchar', length: 20 })
  navType: 'bottomNav' | 'drawer' | 'tabBar' | 'combined';

  /** Bottom navigation bar config — null when navType does not include bottomNav. */
  @Column({ name: 'bottom_nav', type: 'jsonb', nullable: true })
  bottomNav: NavConfig | null;

  /** Side drawer config — null when navType does not include drawer. */
  @Column({ type: 'jsonb', nullable: true })
  drawer: NavConfig | null;

  /** Top tab bar config — null when navType is not tabBar. */
  @Column({ name: 'tab_bar', type: 'jsonb', nullable: true })
  tabBar: NavConfig | null;

  /** Slug of the screen shown on first launch. */
  @Column({ name: 'initial_route', type: 'varchar', length: 200 })
  initialRoute: string;

  /** Slug of the screen unauthenticated users are redirected to. */
  @Column({ name: 'auth_redirect', type: 'varchar', length: 200 })
  authRedirect: string;

  /** After login, go to this slug; null means Navigator.pop(). */
  @Column({
    name: 'post_login_redirect',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  postLoginRedirect: string | null;

  /** App this nav config belongs to — one nav config per app. */
  @Column({ name: 'app_id', type: 'varchar', length: 32, unique: true })
  appId: string;

  /** UUID of admin who last saved this config. */
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
