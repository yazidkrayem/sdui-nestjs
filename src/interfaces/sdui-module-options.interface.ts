import { CanActivate, Type } from '@nestjs/common';
import { SduiCachePort } from './sdui-cache.port';
import { SduiAuditPort } from './sdui-audit.port';
import { SduiPushPort, SduiDeviceTokenPort } from './sdui-push.port';

/**
 * Same shape NestJS itself uses for async module options (e.g. TypeOrmModuleAsyncOptions):
 * supply a ready value, a class for Nest to instantiate via DI, or a factory with injected deps.
 * Exactly one of useClass/useValue/useFactory should be set.
 */
export interface SduiPortProvider<T> {
  useClass?: Type<T>;
  useValue?: T;
  useFactory?: (...args: any[]) => T | Promise<T>;
  inject?: any[];
}

export interface SduiModuleOptions {
  /**
   * CanActivate that authenticates the request and attaches `request.sduiActor`.
   * Defaults to an allow-all guard that logs a startup warning — replace this
   * before running with real admin users.
   */
  authGuard?: SduiPortProvider<CanActivate>;
  /** Defaults to an in-memory Map — fine for a single instance, not for multi-instance deploys. */
  cache?: SduiPortProvider<SduiCachePort>;
  /** Defaults to a no-op logger. */
  audit?: SduiPortProvider<SduiAuditPort>;
  /** Makes the resolved providers available outside SduiModule (standard Nest `global` flag). */
  isGlobal?: boolean;
  /**
   * Host domain used to build the `universalUrl` in GET /sdui/link/:slug
   * (e.g. `https://app.example.com`). Omit to disable universal-link
   * generation — the response will only include `appScheme`.
   */
  deepLinkBaseUrl?: string;
}

export interface SduiPushModuleOptions {
  push: SduiPortProvider<SduiPushPort>;
  deviceTokens: SduiPortProvider<SduiDeviceTokenPort>;
}
