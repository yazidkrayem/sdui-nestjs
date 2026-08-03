import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { App } from '../entities/app.entity';
import { SduiNavConfig, type NavConfig } from '../entities/sdui-nav-config.entity';
import { SduiScreen, SduiScreenStatus } from '../entities/sdui-screen.entity';
import { SduiAuditPort } from '../interfaces/sdui-audit.port';
import { SDUI_AUDIT_PROVIDER } from '../constants/tokens';
import { CreateAppDto } from '../dto/create-app.dto';
import { UpdateAppDto, UpdateAppStatusDto } from '../dto/update-app.dto';

const DEFAULT_NAV: NavConfig = {
  backgroundColor: '#FFFFFF',
  activeColor: '#3B82F6',
  inactiveColor: '#9CA3AF',
  fontSize: 12,
  fontWeight: '500',
  iconSize: 24,
  showLabels: true,
  items: [],
};

export interface AppWithStats {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  primaryColor: string | null;
  status: 'active' | 'suspended' | 'archived';
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  screenCounts: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
}

@Injectable()
export class SduiAppsService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(SduiNavConfig)
    private readonly navRepo: Repository<SduiNavConfig>,
    @InjectRepository(SduiScreen)
    private readonly screenRepo: Repository<SduiScreen>,
    @Inject(SDUI_AUDIT_PROVIDER) private readonly auditLog: SduiAuditPort,
  ) {}

  async findAll(): Promise<AppWithStats[]> {
    const apps = await this.appRepo.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(apps.map((a) => this.attachStats(a)));
  }

  async findOne(appId: string): Promise<AppWithStats> {
    const app = await this.appRepo.findOne({
      where: { appId, deletedAt: IsNull() },
    });
    if (!app) throw new NotFoundException('App not found');
    return this.attachStats(app);
  }

  async create(dto: CreateAppDto, adminId: string): Promise<AppWithStats> {
    const existing = await this.appRepo.findOne({
      where: { appId: dto.appId },
    });
    if (existing) {
      throw new ConflictException(`App ID '${dto.appId}' is already taken`);
    }
    const app = await this.appRepo.save(
      this.appRepo.create({
        appId: dto.appId,
        name: dto.name,
        description: dto.description ?? null,
        primaryColor: dto.primaryColor ?? null,
        status: 'active',
        createdBy: adminId,
      }),
    );
    // Auto-create default nav config for this app
    await this.navRepo.save(
      this.navRepo.create({
        appId: app.appId,
        navType: 'bottomNav',
        bottomNav: DEFAULT_NAV,
        drawer: null,
        tabBar: null,
        initialRoute: 'home',
        authRedirect: 'login',
        postLoginRedirect: null,
      }),
    );
    this.auditLog.record(adminId, 'create_sdui_app', app.id, 'sdui_app', {
      appId: app.appId,
      name: app.name,
    });
    return this.attachStats(app);
  }

  async update(
    appId: string,
    dto: UpdateAppDto,
    adminId: string,
  ): Promise<AppWithStats> {
    const app = await this.findAppOrFail(appId);
    Object.assign(app, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
    });
    const saved = await this.appRepo.save(app);
    this.auditLog.record(adminId, 'update_sdui_app', saved.id, 'sdui_app', {
      appId: saved.appId,
    });
    return this.attachStats(saved);
  }

  async updateStatus(
    appId: string,
    dto: UpdateAppStatusDto,
    adminId: string,
  ): Promise<AppWithStats> {
    const app = await this.findAppOrFail(appId);
    app.status = dto.status;
    const saved = await this.appRepo.save(app);
    const action =
      dto.status === 'suspended' ? 'suspend_sdui_app' : 'update_sdui_app';
    this.auditLog.record(adminId, action, saved.id, 'sdui_app', {
      appId: saved.appId,
      status: dto.status,
    });
    return this.attachStats(saved);
  }

  async softDelete(appId: string, adminId: string): Promise<void> {
    const app = await this.findAppOrFail(appId);
    const publishedCount = await this.screenRepo.count({
      where: {
        appId,
        status: SduiScreenStatus.PUBLISHED,
        deletedAt: IsNull(),
      },
    });
    if (publishedCount > 0) {
      throw new ConflictException(
        'Cannot delete an app with published screens. Unpublish all screens first.',
      );
    }
    await this.appRepo.softDelete({ appId });
    this.auditLog.record(adminId, 'delete_sdui_app', app.id, 'sdui_app', {
      appId,
    });
  }

  private async findAppOrFail(appId: string): Promise<App> {
    const app = await this.appRepo.findOne({
      where: { appId, deletedAt: IsNull() },
    });
    if (!app) throw new NotFoundException('App not found');
    return app;
  }

  private async attachStats(app: App): Promise<AppWithStats> {
    const [total, published, draft, archived] = await Promise.all([
      this.screenRepo.count({
        where: { appId: app.appId, deletedAt: IsNull() },
      }),
      this.screenRepo.count({
        where: {
          appId: app.appId,
          status: SduiScreenStatus.PUBLISHED,
          deletedAt: IsNull(),
        },
      }),
      this.screenRepo.count({
        where: {
          appId: app.appId,
          status: SduiScreenStatus.DRAFT,
          deletedAt: IsNull(),
        },
      }),
      this.screenRepo.count({
        where: {
          appId: app.appId,
          status: SduiScreenStatus.ARCHIVED,
          deletedAt: IsNull(),
        },
      }),
    ]);
    return {
      id: app.id,
      appId: app.appId,
      name: app.name,
      description: app.description,
      iconUrl: app.iconUrl,
      primaryColor: app.primaryColor,
      status: app.status,
      createdBy: app.createdBy,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      screenCounts: { total, published, draft, archived },
    };
  }
}
