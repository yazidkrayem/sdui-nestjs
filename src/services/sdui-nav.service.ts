import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SduiNavConfig } from '../entities/sdui-nav-config.entity';
import { SduiCachePort } from '../interfaces/sdui-cache.port';
import { SduiAuditPort } from '../interfaces/sdui-audit.port';
import { SDUI_CACHE_PROVIDER, SDUI_AUDIT_PROVIDER } from '../constants/tokens';
import { UpdateNavDto } from '../dto/update-nav.dto';

const NAV_TTL = 60;

const navKey = (appId: string) => `${appId}:nav:config`;
const appConfigKey = (appId: string) => `${appId}:app:config`;
const appConfigVersionKey = (appId: string) => `${appId}:app:config:version`;

@Injectable()
export class SduiNavService {
  constructor(
    @InjectRepository(SduiNavConfig)
    private readonly repo: Repository<SduiNavConfig>,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
    @Inject(SDUI_AUDIT_PROVIDER) private readonly auditLog: SduiAuditPort,
  ) {}

  /** Returns the nav config for the given app (cached 60s). */
  async getNav(appId: string): Promise<SduiNavConfig> {
    const cacheKey = navKey(appId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached) as SduiNavConfig;
    const config = await this.findOrFail(appId);
    await this.cache.set(cacheKey, JSON.stringify(config), NAV_TTL);
    return config;
  }

  /** Full-replace update of JSONB fields for the given app. */
  async updateNav(
    appId: string,
    dto: UpdateNavDto,
    adminId: string,
  ): Promise<SduiNavConfig> {
    const config = await this.findOrFail(appId);
    Object.assign(config, {
      ...(dto.navType !== undefined && { navType: dto.navType }),
      ...(dto.bottomNav !== undefined && { bottomNav: dto.bottomNav }),
      ...(dto.drawer !== undefined && { drawer: dto.drawer }),
      ...(dto.tabBar !== undefined && { tabBar: dto.tabBar }),
      ...(dto.initialRoute !== undefined && { initialRoute: dto.initialRoute }),
      ...(dto.authRedirect !== undefined && { authRedirect: dto.authRedirect }),
      ...(dto.postLoginRedirect !== undefined && {
        postLoginRedirect: dto.postLoginRedirect,
      }),
      updatedBy: adminId,
    });
    const saved = await this.repo.save(config);
    await this.invalidateNavCache(appId);
    await this.invalidateAppConfigCache(appId);
    this.auditLog.record(
      adminId,
      'update_sdui_nav',
      saved.id,
      'sdui_nav_config',
    );
    return saved;
  }

  async invalidateAppConfigCache(appId: string): Promise<void> {
    await this.cache.incr(appConfigVersionKey(appId));
    await this.cache.del(appConfigKey(appId));
  }

  async invalidateNavCache(appId: string): Promise<void> {
    await this.cache.del(navKey(appId));
  }

  private async findOrFail(appId: string): Promise<SduiNavConfig> {
    const config = await this.repo.findOne({ where: { appId } });
    if (!config)
      throw new Error(
        `Nav config not found for app '${appId}' — run migrations`,
      );
    return config;
  }
}
