import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { SduiScreen, SduiScreenStatus } from '../entities/sdui-screen.entity';
import { SduiScreenVersion } from '../entities/sdui-screen-version.entity';
import { App } from '../entities/app.entity';
import { SduiCachePort } from '../interfaces/sdui-cache.port';
import { SduiAuditPort } from '../interfaces/sdui-audit.port';
import { SDUI_CACHE_PROVIDER, SDUI_AUDIT_PROVIDER } from '../constants/tokens';
import { PaginatedResponseDto, PaginationDto } from '../dto/pagination.dto';
import { CreateSduiScreenDto } from '../dto/create-sdui-screen.dto';
import { UpdateSduiScreenDto } from '../dto/update-sdui-screen.dto';
import { ReorderSduiScreensDto } from '../dto/reorder-sdui-screens.dto';
import { CreateFromTemplateDto } from '../dto/create-from-template.dto';
import {
  SCREEN_TEMPLATES,
  ScreenTemplate,
  getTemplate,
} from '../templates/screen-templates';
import { DescriptorSchema } from '../schema/descriptor.schema';
import { getPalette, PaletteEntry } from '../registry/component-registry';
import { SduiStringsService } from './sdui-strings.service';
import { SduiNavService } from './sdui-nav.service';
import { SduiGateway } from '../gateway/sdui.gateway';

const MANIFEST_TTL = 60;
const SCREEN_TTL = 60;
const APP_CONFIG_TTL = 60;
const MAX_VERSIONS = 20;
// Bump this when the descriptor schema gains a breaking change; Flutter clients
// that support only lower versions will show an update prompt rather than crash.
const SUPPORTED_SCHEMA_VERSION = 1;

const MAX_DESCRIPTOR_DEPTH = 10;
const MAX_DESCRIPTOR_NODES = 500;
const MAX_DESCRIPTOR_BYTES = 524_288; // 512 KB

const manifestKey = (appId: string, role?: string) =>
  `${appId}:manifest:${role ?? ''}`;
const screenKey = (appId: string, slug: string) => `${appId}:screen:${slug}`;
const appConfigKey = (appId: string) => `${appId}:app:config`;
const appConfigVersionKey = (appId: string) => `${appId}:app:config:version`;

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class SduiScreenResponseDto {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
  visible: boolean;
  roles: string[];
  descriptor: Record<string, unknown>;
  schemaVersion: number;
  status: SduiScreenStatus;
  publishedAt: Date | null;
  publishedBy: string | null;
  authRequired: boolean;
  redirectIfUnauth: string | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Present on create/update when a descriptor was supplied: the result of
   * the strict publish-time Zod validation, so the builder can surface
   * problems immediately instead of discovering them at publish.
   */
  validation?: { valid: boolean; errors: { path: string; message: string }[] };

  static from(s: SduiScreen): SduiScreenResponseDto {
    const dto = new SduiScreenResponseDto();
    dto.id = s.id;
    dto.name = s.name;
    dto.slug = s.slug;
    dto.icon = s.icon;
    dto.order = s.order;
    dto.visible = s.visible;
    dto.roles = s.roles ?? [];
    dto.descriptor = s.descriptor;
    dto.schemaVersion = s.schemaVersion;
    dto.status = s.status;
    dto.publishedAt = s.publishedAt;
    dto.publishedBy = s.publishedBy;
    dto.authRequired = s.authRequired ?? false;
    dto.redirectIfUnauth = s.redirectIfUnauth ?? null;
    dto.createdAt = s.createdAt;
    dto.updatedAt = s.updatedAt;
    return dto;
  }
}

export class SduiVersionResponseDto {
  id: string;
  screenId: string;
  descriptor: Record<string, unknown>;
  schemaVersion: number;
  savedBy: string;
  savedAt: Date;
  label: string | null;
  isActive: boolean;

  static from(v: SduiScreenVersion): SduiVersionResponseDto {
    const dto = new SduiVersionResponseDto();
    dto.id = v.id;
    dto.screenId = v.screenId;
    dto.descriptor = v.descriptor;
    dto.schemaVersion = v.schemaVersion;
    dto.savedBy = v.savedBy;
    dto.savedAt = v.savedAt;
    dto.label = v.label;
    dto.isActive = v.isActive;
    return dto;
  }
}

export interface SduiStatsDto {
  totalScreens: number;
  publishedScreens: number;
  draftScreens: number;
  archivedScreens: number;
  lastPublishedAt: Date | null;
}

export interface SduiPublicScreenDto {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  schemaVersion: number;
  descriptor: Record<string, unknown>;
  publishedAt: Date | null;
  cacheTtl: number;
  authRequired: boolean;
  roles: string[];
  redirectIfUnauth: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SduiService {
  private readonly logger = new Logger(SduiService.name);

  constructor(
    @InjectRepository(SduiScreen)
    private readonly repo: Repository<SduiScreen>,
    @InjectRepository(SduiScreenVersion)
    private readonly versionRepo: Repository<SduiScreenVersion>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
    @Inject(SDUI_AUDIT_PROVIDER) private readonly auditLog: SduiAuditPort,
    private readonly stringsService: SduiStringsService,
    private readonly navService: SduiNavService,
    private readonly gateway: SduiGateway,
  ) {}

  // ── Public app resolution ─────────────────────────────────────────────────

  async resolvePublicApp(appId: string | undefined): Promise<App> {
    if (!appId?.trim()) {
      throw new BadRequestException(
        'MISSING_APP_ID: appId query param is required',
      );
    }
    const app = await this.appRepo.findOne({ where: { appId: appId.trim() } });
    if (!app || app.deletedAt) throw new NotFoundException('APP_NOT_FOUND');
    if (app.status === 'suspended') {
      throw new ServiceUnavailableException('APP_SUSPENDED');
    }
    if (app.status === 'archived') throw new NotFoundException('APP_NOT_FOUND');
    return app;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    appId: string,
    query: PaginationDto & { status?: SduiScreenStatus },
  ): Promise<PaginatedResponseDto<SduiScreenResponseDto>> {
    const where: Record<string, unknown> = { appId, deletedAt: IsNull() };
    if (query.status) where['status'] = query.status;

    const [screens, total] = await this.repo.findAndCount({
      where,
      order: { order: 'ASC', name: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
    return PaginatedResponseDto.of(
      screens.map((s) => SduiScreenResponseDto.from(s)),
      total,
      query,
    );
  }

  async findOne(appId: string, id: string): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');
    return SduiScreenResponseDto.from(screen);
  }

  async create(
    appId: string,
    dto: CreateSduiScreenDto,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const slugConflict = await this.repo.findOne({
      where: { appId, slug: dto.slug, deletedAt: IsNull() },
    });
    if (slugConflict) throw new ConflictException('Slug already in use');

    const screen = this.repo.create({
      appId,
      name: dto.name,
      slug: dto.slug,
      icon: dto.icon ?? null,
      order: dto.order ?? 0,
      visible: dto.visible ?? true,
      roles: dto.roles ?? [],
      descriptor: dto.descriptor ?? {},
      schemaVersion: dto.schemaVersion ?? 1,
      status: SduiScreenStatus.DRAFT,
      authRequired: dto.authRequired ?? false,
      redirectIfUnauth: dto.redirectIfUnauth ?? null,
    });

    const saved = await this.repo.save(screen);
    this.auditLog.record(
      adminId,
      'create_sdui_screen',
      saved.id,
      'sdui_screen',
      {
        appId,
        slug: saved.slug,
      },
    );
    void this.invalidateManifest(appId);
    if (dto.descriptor) {
      try {
        await this.stringsService.syncDescriptorStrings(
          appId,
          saved.slug,
          saved.descriptor,
          adminId,
        );
      } catch (err) {
        this.logger.warn(
          `String sync failed on create for ${saved.slug}: ${(err as Error).message}`,
        );
      }
    }
    const response = SduiScreenResponseDto.from(saved);
    // Drafts may be saved in an invalid state on purpose; surface the strict
    // validation result as a warning instead of rejecting (publish enforces it).
    if (dto.descriptor) {
      response.validation = this.validateDescriptor(saved.descriptor);
    }
    return response;
  }

  async update(
    appId: string,
    id: string,
    dto: UpdateSduiScreenDto,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');
    if (screen.status === SduiScreenStatus.ARCHIVED) {
      throw new ForbiddenException('Archived screens cannot be edited');
    }

    if (dto.slug && dto.slug !== screen.slug) {
      const conflict = await this.repo.findOne({
        where: { appId, slug: dto.slug, deletedAt: IsNull() },
      });
      if (conflict) throw new ConflictException('Slug already in use');
    }

    if (
      screen.status === SduiScreenStatus.PUBLISHED &&
      dto.descriptor !== undefined
    ) {
      await this.snapshotVersion(screen, adminId, false);
    }

    Object.assign(screen, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.order !== undefined && { order: dto.order }),
      ...(dto.visible !== undefined && { visible: dto.visible }),
      ...(dto.roles !== undefined && { roles: dto.roles }),
      ...(dto.descriptor !== undefined && { descriptor: dto.descriptor }),
      ...(dto.schemaVersion !== undefined && {
        schemaVersion: dto.schemaVersion,
      }),
      ...(dto.authRequired !== undefined && { authRequired: dto.authRequired }),
      ...(dto.redirectIfUnauth !== undefined && {
        redirectIfUnauth: dto.redirectIfUnauth,
      }),
    });

    const saved = await this.repo.save(screen);
    this.auditLog.record(adminId, 'update_sdui_screen', id, 'sdui_screen');
    void this.invalidateManifest(appId);
    void this.invalidateScreenCache(appId, screen.slug);
    if (dto.descriptor) {
      try {
        await this.stringsService.syncDescriptorStrings(
          appId,
          saved.slug,
          saved.descriptor,
          adminId,
        );
      } catch (err) {
        this.logger.warn(
          `String sync failed on update for ${saved.slug}: ${(err as Error).message}`,
        );
      }
    }
    const response = SduiScreenResponseDto.from(saved);
    if (dto.descriptor !== undefined) {
      response.validation = this.validateDescriptor(saved.descriptor);
    }
    return response;
  }

  async reorder(
    appId: string,
    dto: ReorderSduiScreensDto,
    adminId: string,
  ): Promise<void> {
    await Promise.all(
      dto.screens.map(({ id, order }) =>
        this.repo.update({ appId, id, deletedAt: IsNull() }, { order }),
      ),
    );
    this.auditLog.record(
      adminId,
      'reorder_sdui_screens',
      undefined,
      'sdui_screen',
    );
    void this.invalidateManifest(appId);
  }

  async softDelete(appId: string, id: string, adminId: string): Promise<void> {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');

    await this.repo.save({
      ...screen,
      deletedAt: new Date(),
      deletedBy: adminId,
    });
    this.auditLog.record(adminId, 'delete_sdui_screen', id, 'sdui_screen', {
      appId,
      slug: screen.slug,
    });
    void this.invalidateManifest(appId);
    void this.invalidateScreenCache(appId, screen.slug);
  }

  async findDeleted(appId: string): Promise<SduiScreenResponseDto[]> {
    const screens = await this.repo.find({
      where: { appId },
      withDeleted: true,
      order: { deletedAt: 'DESC' },
    });
    return screens
      .filter((s) => s.deletedAt !== null)
      .map((s) => SduiScreenResponseDto.from(s));
  }

  async restoreDeleted(
    appId: string,
    id: string,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id },
      withDeleted: true,
    });
    if (!screen || !screen.deletedAt) {
      throw new NotFoundException('Deleted screen not found');
    }

    await this.repo.save({
      ...screen,
      deletedAt: null,
      status: SduiScreenStatus.DRAFT,
    });

    const restored = await this.repo.findOneOrFail({ where: { appId, id } });
    this.auditLog.record(adminId, 'restore_sdui_screen', id, 'sdui_screen', {
      appId,
      slug: screen.slug,
    });
    void this.invalidateManifest(appId);
    return SduiScreenResponseDto.from(restored);
  }

  // ── Publish / unpublish / archive ─────────────────────────────────────────

  async publish(
    appId: string,
    id: string,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');
    if (screen.status === SduiScreenStatus.ARCHIVED) {
      throw new ForbiddenException('Restore screen to Draft before publishing');
    }

    const limitsCheck = this.validateDescriptorLimits(screen.descriptor);
    if (!limitsCheck.valid) {
      throw new BadRequestException(
        `Descriptor exceeds limits: ${limitsCheck.errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`,
      );
    }

    const validation = this.validateDescriptor(screen.descriptor);
    if (!validation.valid) {
      throw new BadRequestException(
        `Descriptor has validation errors: ${validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`,
      );
    }

    screen.status = SduiScreenStatus.PUBLISHED;
    screen.publishedAt = new Date();
    screen.publishedBy = adminId;

    const saved = await this.repo.save(screen);
    await this.snapshotVersion(saved, adminId, true);

    this.auditLog.record(adminId, 'publish_sdui_screen', id, 'sdui_screen', {
      appId,
      slug: screen.slug,
    });
    void this.invalidateManifest(appId);
    void this.invalidateScreenCache(appId, screen.slug);
    void this.invalidateAppConfig(appId);
    try {
      await this.stringsService.syncDescriptorStrings(
        appId,
        saved.slug,
        saved.descriptor,
        adminId,
      );
    } catch (err) {
      this.logger.warn(
        `String sync failed on publish for ${saved.slug}: ${(err as Error).message}`,
      );
    }
    return SduiScreenResponseDto.from(saved);
  }

  async unpublish(
    appId: string,
    id: string,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');

    screen.status = SduiScreenStatus.DRAFT;
    const saved = await this.repo.save(screen);
    this.auditLog.record(adminId, 'unpublish_sdui_screen', id, 'sdui_screen', {
      appId,
      slug: screen.slug,
    });
    void this.invalidateManifest(appId);
    void this.invalidateScreenCache(appId, screen.slug);
    void this.invalidateAppConfig(appId);
    return SduiScreenResponseDto.from(saved);
  }

  async archive(
    appId: string,
    id: string,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');
    if (screen.status === SduiScreenStatus.PUBLISHED) {
      throw new ConflictException('Unpublish the screen before archiving');
    }

    screen.status = SduiScreenStatus.ARCHIVED;
    const saved = await this.repo.save(screen);
    this.auditLog.record(adminId, 'archive_sdui_screen', id, 'sdui_screen', {
      appId,
      slug: screen.slug,
    });
    void this.invalidateManifest(appId);
    void this.invalidateScreenCache(appId, screen.slug);
    void this.invalidateAppConfig(appId);
    return SduiScreenResponseDto.from(saved);
  }

  // ── Version history ───────────────────────────────────────────────────────

  async getVersions(
    appId: string,
    screenId: string,
  ): Promise<SduiVersionResponseDto[]> {
    const screen = await this.repo.findOne({
      where: { appId, id: screenId, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');

    const versions = await this.versionRepo.find({
      where: { appId, screenId },
      order: { savedAt: 'DESC' },
    });
    return versions.map((v) => SduiVersionResponseDto.from(v));
  }

  async updateVersionLabel(
    appId: string,
    screenId: string,
    versionId: string,
    label: string,
  ): Promise<SduiVersionResponseDto> {
    const version = await this.versionRepo.findOne({
      where: { appId, id: versionId, screenId },
    });
    if (!version) throw new NotFoundException('Version not found');
    version.label = label;
    const saved = await this.versionRepo.save(version);
    return SduiVersionResponseDto.from(saved);
  }

  async restoreVersion(
    appId: string,
    screenId: string,
    versionId: string,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const screen = await this.repo.findOne({
      where: { appId, id: screenId, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');

    const version = await this.versionRepo.findOne({
      where: { appId, id: versionId, screenId },
    });
    if (!version) throw new NotFoundException('Version not found');

    if (version.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
      throw new BadRequestException(
        `Version schema_version ${version.schemaVersion} exceeds the currently supported maximum (${SUPPORTED_SCHEMA_VERSION}). ` +
          `Bump SUPPORTED_SCHEMA_VERSION in sdui.service.ts after updating the Flutter client.`,
      );
    }

    screen.descriptor = version.descriptor;
    screen.schemaVersion = version.schemaVersion;
    screen.status = SduiScreenStatus.DRAFT;
    const saved = await this.repo.save(screen);

    this.auditLog.record(
      adminId,
      'restore_sdui_version',
      screenId,
      'sdui_screen',
      { appId, versionId, slug: screen.slug },
    );
    void this.invalidateManifest(appId);
    void this.invalidateScreenCache(appId, screen.slug);
    return SduiScreenResponseDto.from(saved);
  }

  async deleteVersion(
    appId: string,
    screenId: string,
    versionId: string,
  ): Promise<void> {
    const version = await this.versionRepo.findOne({
      where: { appId, id: versionId, screenId },
    });
    if (!version) throw new NotFoundException('Version not found');
    if (version.isActive) {
      throw new ConflictException('Cannot delete the active (live) version');
    }
    await this.versionRepo.remove(version);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(appId: string): Promise<SduiStatsDto> {
    const [total, published, draft, archived, lastPub] = await Promise.all([
      this.repo.count({ where: { appId, deletedAt: IsNull() } }),
      this.repo.count({
        where: {
          appId,
          status: SduiScreenStatus.PUBLISHED,
          deletedAt: IsNull(),
        },
      }),
      this.repo.count({
        where: { appId, status: SduiScreenStatus.DRAFT, deletedAt: IsNull() },
      }),
      this.repo.count({
        where: {
          appId,
          status: SduiScreenStatus.ARCHIVED,
          deletedAt: IsNull(),
        },
      }),
      this.repo.findOne({
        where: {
          appId,
          status: SduiScreenStatus.PUBLISHED,
          deletedAt: IsNull(),
        },
        order: { publishedAt: 'DESC' },
        select: { publishedAt: true },
      }),
    ]);

    return {
      totalScreens: total,
      publishedScreens: published,
      draftScreens: draft,
      archivedScreens: archived,
      lastPublishedAt: lastPub?.publishedAt ?? null,
    };
  }

  // ── Manifest & public screen ──────────────────────────────────────────────

  async getManifest(
    appId: string,
    role?: string,
    clientVersion?: number,
  ): Promise<{ screens: SduiScreenResponseDto[]; etag: string }> {
    const cacheKey = manifestKey(appId, role);
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached) as {
          screens: SduiScreenResponseDto[];
          etag: string;
        };
        // Client version filtering is done post-cache since it's client-specific
        // and we don't want to cache per-version (versions change rarely).
        if (clientVersion !== undefined) {
          payload.screens = payload.screens.filter(
            (s) => s.schemaVersion <= clientVersion,
          );
        }
        return payload;
      }
    } catch {
      // cache unavailable — fall through to DB
    }

    const screens = await this.repo.find({
      where: {
        appId,
        visible: true,
        status: SduiScreenStatus.PUBLISHED,
        deletedAt: IsNull(),
      },
      order: { order: 'ASC' },
    });

    const filtered = role
      ? screens.filter((s) => s.roles.length === 0 || s.roles.includes(role))
      : screens;

    // Cache the full set, then apply client version filter on the result
    const allResult = filtered.map((s) => SduiScreenResponseDto.from(s));
    const etag = this.computeEtag(JSON.stringify(allResult));
    const payload = { screens: allResult, etag };
    try {
      await this.cache.set(cacheKey, JSON.stringify(payload), MANIFEST_TTL);
    } catch {
      // non-fatal
    }

    if (clientVersion !== undefined) {
      return {
        screens: allResult.filter((s) => s.schemaVersion <= clientVersion),
        etag,
      };
    }
    return payload;
  }

  async getPublicScreen(
    appId: string,
    slug: string,
    clientVersion?: number,
    previewToken?: string,
  ): Promise<SduiPublicScreenDto> {
    // Preview token path: bypass cache + published-only restriction
    if (previewToken) {
      return this.getPreviewScreen(appId, slug, previewToken);
    }

    const cacheKey = screenKey(appId, slug);
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        const dto = JSON.parse(cached) as SduiPublicScreenDto;
        if (clientVersion !== undefined && dto.schemaVersion > clientVersion) {
          throw new ConflictException(
            JSON.stringify({
              error: 'SCHEMA_VERSION_MISMATCH',
              screenVersion: dto.schemaVersion,
              clientVersion,
            }),
          );
        }
        return dto;
      }
    } catch (err) {
      if ((err as { status?: number }).status === 409) throw err;
      // cache unavailable — fall through to DB
    }

    const screen = await this.repo.findOne({
      where: {
        appId,
        slug,
        status: SduiScreenStatus.PUBLISHED,
        deletedAt: IsNull(),
      },
    });
    if (!screen) throw new NotFoundException('Screen not found');

    if (clientVersion !== undefined && screen.schemaVersion > clientVersion) {
      throw new ConflictException(
        JSON.stringify({
          error: 'SCHEMA_VERSION_MISMATCH',
          screenVersion: screen.schemaVersion,
          clientVersion,
        }),
      );
    }

    const dto: SduiPublicScreenDto = {
      id: screen.id,
      slug: screen.slug,
      name: screen.name,
      icon: screen.icon,
      schemaVersion: screen.schemaVersion,
      descriptor: screen.descriptor,
      publishedAt: screen.publishedAt,
      cacheTtl: SCREEN_TTL,
      authRequired: screen.authRequired ?? false,
      roles: screen.roles ?? [],
      redirectIfUnauth: screen.redirectIfUnauth ?? null,
    };

    try {
      await this.cache.set(cacheKey, JSON.stringify(dto), SCREEN_TTL);
    } catch {
      // non-fatal
    }
    return dto;
  }

  async resolvePreviewById(
    appId: string,
    screenId: string,
  ): Promise<SduiPublicScreenDto> {
    const screen = await this.repo.findOne({
      where: { appId, id: screenId, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('Screen not found');
    return {
      id: screen.id,
      slug: screen.slug,
      name: screen.name,
      icon: screen.icon,
      schemaVersion: screen.schemaVersion,
      descriptor: screen.descriptor,
      publishedAt: screen.publishedAt,
      cacheTtl: 0,
      authRequired: screen.authRequired ?? false,
      roles: screen.roles ?? [],
      redirectIfUnauth: screen.redirectIfUnauth ?? null,
    };
  }

  private async getPreviewScreen(
    appId: string,
    slug: string,
    token: string,
  ): Promise<SduiPublicScreenDto> {
    let tokenData: { screenId: string; appId: string } | null = null;
    try {
      const raw = await this.cache.get(`sdui:preview:${token}`);
      if (raw)
        tokenData = JSON.parse(raw) as { screenId: string; appId: string };
    } catch {
      // non-fatal
    }
    if (!tokenData) {
      throw new NotFoundException('Preview token not found or expired');
    }
    if (tokenData.appId !== appId) {
      throw new NotFoundException('Preview token not found or expired');
    }

    const screen = await this.repo.findOne({
      where: { appId, id: tokenData.screenId, deletedAt: IsNull() },
    });
    if (!screen || screen.slug !== slug) {
      throw new NotFoundException('Screen not found');
    }

    return {
      id: screen.id,
      slug: screen.slug,
      name: screen.name,
      icon: screen.icon,
      schemaVersion: screen.schemaVersion,
      descriptor: screen.descriptor,
      publishedAt: screen.publishedAt,
      cacheTtl: 0,
      authRequired: screen.authRequired ?? false,
      roles: screen.roles ?? [],
      redirectIfUnauth: screen.redirectIfUnauth ?? null,
    };
  }

  computeEtag(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  async invalidateManifest(appId: string): Promise<void> {
    try {
      const keys = await this.cache.keys(`${appId}:manifest:*`);
      if (keys.length > 0) {
        await this.cache.del(...keys);
      }
    } catch {
      // non-fatal
    }
  }

  async invalidateScreenCache(appId: string, slug: string): Promise<void> {
    try {
      await this.cache.del(screenKey(appId, slug));
    } catch {
      // non-fatal
    }
  }

  async invalidateAppConfig(appId: string): Promise<void> {
    let version = 1;
    try {
      version = await this.cache.incr(appConfigVersionKey(appId));
      await this.cache.del(appConfigKey(appId));
    } catch {
      // non-fatal
    }
    this.gateway.notifyConfigUpdated(appId, version);
  }

  /**
   * Validates descriptor against structural limits:
   * max depth 10, max nodes 500, max size 512 KB, no duplicate IDs.
   */
  validateDescriptorLimits(descriptor: unknown): {
    valid: boolean;
    errors: { path: string; message: string }[];
  } {
    const errors: { path: string; message: string }[] = [];
    const size = JSON.stringify(descriptor).length;
    if (size > MAX_DESCRIPTOR_BYTES) {
      errors.push({
        path: 'root',
        message: `Descriptor size ${size} bytes exceeds max ${MAX_DESCRIPTOR_BYTES} bytes (512 KB)`,
      });
    }

    if (descriptor && typeof descriptor === 'object' && 'root' in descriptor) {
      const ids = new Set<string>();
      let nodeCount = 0;

      const walk = (
        node: { id?: string; children?: unknown[] },
        depth: number,
        path: string,
      ): void => {
        if (depth > MAX_DESCRIPTOR_DEPTH) {
          errors.push({
            path,
            message: `Max nesting depth ${MAX_DESCRIPTOR_DEPTH} exceeded`,
          });
          return;
        }
        nodeCount++;
        if (nodeCount > MAX_DESCRIPTOR_NODES) {
          errors.push({
            path,
            message: `Max node count ${MAX_DESCRIPTOR_NODES} exceeded`,
          });
          return;
        }
        if (node.id) {
          if (ids.has(node.id)) {
            errors.push({ path, message: `Duplicate node ID: ${node.id}` });
          } else {
            ids.add(node.id);
          }
        }
        if (Array.isArray(node.children)) {
          for (let i = 0; i < node.children.length; i++) {
            walk(
              node.children[i] as { id?: string; children?: unknown[] },
              depth + 1,
              `${path}.children[${i}]`,
            );
          }
        }
      };

      walk(
        (descriptor as { root: { id?: string; children?: unknown[] } }).root,
        0,
        'root',
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Unified Flutter bootstrap response, scoped to a single app.
   * Fetches nav config from the cache using the appId-scoped key.
   */
  async getAppConfig(appId: string): Promise<Record<string, unknown>> {
    const configCacheKey = appConfigKey(appId);
    try {
      const cached = await this.cache.get(configCacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;
    } catch {
      // cache unavailable — fall through to DB
    }

    let versionRaw: string | null = null;
    try {
      versionRaw = await this.cache.get(appConfigVersionKey(appId));
    } catch {
      // non-fatal
    }

    const [screens, strings, navConfig, app] = await Promise.all([
      this.repo.find({
        where: {
          appId,
          status: SduiScreenStatus.PUBLISHED,
          deletedAt: IsNull(),
        },
        order: { order: 'ASC' },
      }),
      this.stringsService.getAllStrings(appId),
      this.navService.getNav(appId).catch(() => null),
      this.appRepo.findOne({ where: { appId } }).catch(() => null),
    ]);

    const version = versionRaw ? parseInt(versionRaw, 10) : 1;
    const lastPublished = screens.reduce<Date | null>((latest, s) => {
      if (!s.publishedAt) return latest;
      if (!latest || s.publishedAt > latest) return s.publishedAt;
      return latest;
    }, null);

    const minClientVersion = screens.reduce(
      (max, s) => Math.max(max, s.schemaVersion),
      1,
    );

    const config: Record<string, unknown> = {
      version,
      publishedAt: lastPublished?.toISOString() ?? new Date().toISOString(),
      // Minimum Flutter client schema version required to display all screens.
      // Clients with a lower version will see a subset of screens (or an update prompt).
      minClientVersion,
      primaryColor: app?.primaryColor ?? null,
      navigation: navConfig,
      initialRoute: navConfig?.initialRoute ?? 'home',
      authRedirect: navConfig?.authRedirect ?? 'login',
      postLoginRedirect: navConfig?.postLoginRedirect ?? null,
      refreshIntervalSeconds: 300,
      // Descriptors are intentionally omitted here — mobile clients fetch
      // them lazily via GET /sdui/v1/screens/:slug (ETag-cached per screen).
      // This keeps the bootstrap payload small regardless of screen count.
      screens: screens.map((s) => ({
        slug: s.slug,
        name: s.name,
        authRequired: s.authRequired ?? false,
        preAuth: s.preAuth ?? false,
        roles: s.roles ?? [],
        redirectIfUnauth: s.redirectIfUnauth ?? null,
        schemaVersion: s.schemaVersion,
      })),
      strings,
    };

    try {
      await this.cache.set(
        configCacheKey,
        JSON.stringify(config),
        APP_CONFIG_TTL,
      );
    } catch {
      // non-fatal
    }
    return config;
  }

  // ── Templates / registry / validate ──────────────────────────────────────

  getTemplates(): ScreenTemplate[] {
    return SCREEN_TEMPLATES;
  }

  validateDescriptor(descriptor: unknown): {
    valid: boolean;
    errors: { path: string; message: string }[];
  } {
    const result = DescriptorSchema.safeParse(descriptor);
    if (result.success) return { valid: true, errors: [] };
    return {
      valid: false,
      errors: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    };
  }

  async createFromTemplate(
    appId: string,
    dto: CreateFromTemplateDto,
    adminId: string,
  ): Promise<SduiScreenResponseDto> {
    const template = getTemplate(dto.templateId);
    if (!template)
      throw new NotFoundException(`Template '${dto.templateId}' not found`);

    const slugConflict = await this.repo.findOne({
      where: { appId, slug: dto.slug, deletedAt: IsNull() },
    });
    if (slugConflict) throw new ConflictException('Slug already in use');

    const validation = this.validateDescriptor(template.descriptor);
    if (!validation.valid)
      throw new BadRequestException(
        `Template descriptor invalid: ${validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`,
      );

    const screen = this.repo.create({
      appId,
      name: dto.name,
      slug: dto.slug,
      icon: template.thumbnail,
      order: 0,
      visible: true,
      roles: dto.roles ?? [],
      descriptor: template.descriptor as Record<string, unknown>,
      schemaVersion: 1,
      status: SduiScreenStatus.DRAFT,
    });

    const saved = await this.repo.save(screen);
    this.auditLog.record(
      adminId,
      'create_sdui_screen',
      saved.id,
      'sdui_screen',
      { appId, slug: saved.slug, templateId: dto.templateId },
    );
    void this.invalidateManifest(appId);
    return SduiScreenResponseDto.from(saved);
  }

  getRegistry(): PaletteEntry[] {
    return getPalette();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async snapshotVersion(
    screen: SduiScreen,
    adminId: string,
    isActive: boolean,
  ): Promise<void> {
    if (isActive) {
      await this.versionRepo.update(
        { screenId: screen.id, isActive: true },
        { isActive: false },
      );
    }

    const version = this.versionRepo.create({
      appId: screen.appId,
      screenId: screen.id,
      descriptor: screen.descriptor,
      schemaVersion: screen.schemaVersion,
      savedBy: adminId,
      isActive,
    });
    await this.versionRepo.save(version);

    const count = await this.versionRepo.count({
      where: { screenId: screen.id },
    });
    if (count > MAX_VERSIONS) {
      const oldest = await this.versionRepo.find({
        where: { screenId: screen.id, isActive: false },
        order: { savedAt: 'ASC' },
        take: count - MAX_VERSIONS,
      });
      if (oldest.length > 0) {
        await this.versionRepo.remove(oldest);
      }
    }
  }
}
