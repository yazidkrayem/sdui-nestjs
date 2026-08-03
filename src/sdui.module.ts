import { CanActivate, DynamicModule, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SDUI_ENTITIES } from './entities';
import {
  SDUI_AUTH_GUARD,
  SDUI_CACHE_PROVIDER,
  SDUI_AUDIT_PROVIDER,
  SDUI_DEEPLINK_BASE_URL,
} from './constants/tokens';
import {
  SduiModuleOptions,
  SduiPortProvider,
} from './interfaces/sdui-module-options.interface';
import { SduiCachePort } from './interfaces/sdui-cache.port';
import { SduiAuditPort } from './interfaces/sdui-audit.port';
import { SduiAllowAllGuard } from './adapters/default/allow-all.guard';
import { SduiInMemoryCacheAdapter } from './adapters/default/in-memory-cache.adapter';
import { SduiNoopAuditAdapter } from './adapters/default/noop-audit.adapter';
import { SduiAuthGuardProxy } from './guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from './guards/sdui-permission.guard';
import { AppIdGuard } from './guards/app-id.guard';
import { SduiService } from './services/sdui.service';
import { SduiNavService } from './services/sdui-nav.service';
import { SduiStringsService } from './services/sdui-strings.service';
import { SduiAppsService } from './services/sdui-apps.service';
import { SduiGateway } from './gateway/sdui.gateway';
import { SduiAdminController } from './controllers/sdui-admin.controller';
import { SduiAppsController } from './controllers/sdui-apps.controller';
import { SduiDeepLinkController } from './controllers/sdui-deeplink.controller';
import {
  SduiErrorReportAdminController,
  SduiErrorReportPublicController,
} from './controllers/sdui-error-report.controller';
import {
  SduiNavAdminController,
  SduiNavPublicController,
} from './controllers/sdui-nav.controller';
import {
  SduiPreviewAdminController,
  SduiPreviewPublicController,
} from './controllers/sdui-preview.controller';
import {
  SduiAdminPublishController,
  SduiPublicController,
  SduiV1PublicController,
} from './controllers/sdui-public.controller';
import {
  SduiStringsAdminController,
  SduiStringsPublicController,
} from './controllers/sdui-strings.controller';

function resolvePortProvider<T>(
  token: symbol,
  provider: SduiPortProvider<T> | undefined,
  defaultClass: new (...args: never[]) => T,
): Provider {
  if (!provider) return { provide: token, useClass: defaultClass };
  if (provider.useValue !== undefined) {
    return { provide: token, useValue: provider.useValue };
  }
  if (provider.useFactory) {
    return {
      provide: token,
      useFactory: provider.useFactory,
      inject: provider.inject ?? [],
    };
  }
  if (provider.useClass) return { provide: token, useClass: provider.useClass };
  return { provide: token, useClass: defaultClass };
}

@Module({})
export class SduiModule {
  static forRoot(options: SduiModuleOptions = {}): DynamicModule {
    const authGuardProvider = resolvePortProvider<CanActivate>(
      SDUI_AUTH_GUARD,
      options.authGuard,
      SduiAllowAllGuard,
    );
    const cacheProvider = resolvePortProvider<SduiCachePort>(
      SDUI_CACHE_PROVIDER,
      options.cache,
      SduiInMemoryCacheAdapter,
    );
    const auditProvider = resolvePortProvider<SduiAuditPort>(
      SDUI_AUDIT_PROVIDER,
      options.audit,
      SduiNoopAuditAdapter,
    );
    const deepLinkBaseUrlProvider: Provider = {
      provide: SDUI_DEEPLINK_BASE_URL,
      useValue: options.deepLinkBaseUrl,
    };

    return {
      module: SduiModule,
      global: options.isGlobal ?? false,
      imports: [TypeOrmModule.forFeature(SDUI_ENTITIES)],
      controllers: [
        // Static/literal-path controllers must be registered before
        // SduiAdminController (which has GET/PATCH/DELETE :id) — Nest/Express
        // match routes in registration order, so e.g. GET /admin/sdui/nav
        // would otherwise hit the generic :id route first and ParseUUIDPipe
        // would reject "nav" as not a UUID.
        SduiAppsController,
        SduiNavAdminController,
        SduiNavPublicController,
        SduiStringsAdminController,
        SduiStringsPublicController,
        SduiPreviewAdminController,
        SduiPreviewPublicController,
        SduiErrorReportPublicController,
        SduiErrorReportAdminController,
        SduiDeepLinkController,
        // Generic /:id controller last.
        SduiAdminController,
        SduiAdminPublishController,
        SduiPublicController,
        SduiV1PublicController,
      ],
      providers: [
        SduiService,
        SduiNavService,
        SduiStringsService,
        SduiAppsService,
        SduiGateway,
        AppIdGuard,
        SduiPermissionGuard,
        SduiAuthGuardProxy,
        authGuardProvider,
        cacheProvider,
        auditProvider,
        deepLinkBaseUrlProvider,
      ],
      exports: [
        SDUI_CACHE_PROVIDER,
        SDUI_AUDIT_PROVIDER,
        SduiService,
        SduiNavService,
        SduiStringsService,
        SduiAppsService,
      ],
    };
  }
}
