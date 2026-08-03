import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { SduiActor } from '../interfaces/sdui-actor.interface';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiService } from '../services/sdui.service';
import { SduiAuditPort } from '../interfaces/sdui-audit.port';
import { SduiCachePort } from '../interfaces/sdui-cache.port';
import { SDUI_AUDIT_PROVIDER, SDUI_CACHE_PROVIDER } from '../constants/tokens';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('SDUI — Public')
@Controller('sdui')
export class SduiPublicController {
  constructor(
    private readonly sduiService: SduiService,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('health')
  @Throttle({ default: { ttl: 10_000, limit: 10 } })
  @ApiOperation({ summary: 'SDUI health check — DB + cache liveness' })
  async health(@Res() res: Response) {
    const checks: Record<string, 'ok' | 'error'> = {};
    try {
      await this.dataSource.query('SELECT 1');
      checks['db'] = 'ok';
    } catch {
      checks['db'] = 'error';
    }
    try {
      checks['cache'] = (await this.cache.isHealthy()) ? 'ok' : 'error';
    } catch {
      checks['cache'] = 'error';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    res
      .status(allOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ success: allOk, data: checks });
  }

  @Get('manifest')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({
    summary: 'Get mobile navigation manifest (public, cached 60s)',
  })
  @ApiQuery({ name: 'appId', required: true, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async getManifest(
    @Query('appId') appId: string | undefined,
    @Query('role') role: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('x-sdui-client-version') clientVersionHeader: string | undefined,
    @Res() res: Response,
  ) {
    const clientVersion = clientVersionHeader
      ? parseInt(clientVersionHeader, 10) || undefined
      : undefined;
    const app = await this.sduiService.resolvePublicApp(appId);
    const { screens, etag } = await this.sduiService.getManifest(
      app.appId,
      role,
      clientVersion,
    );
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    res
      .set('ETag', `"${etag}"`)
      .set('Cache-Control', 'public, max-age=60')
      .json({ success: true, statusCode: 200, data: screens });
  }

  @Get('screens/:slug')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({
    summary: 'Get a published screen by slug (public, cached 60s)',
  })
  @ApiQuery({ name: 'appId', required: true, type: String })
  @ApiQuery({ name: 'preview', required: false, type: String })
  async getScreen(
    @Param('slug') slug: string,
    @Query('appId') appId: string | undefined,
    @Query('preview') previewToken: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('x-sdui-client-version') clientVersionHeader: string | undefined,
    @Res() res: Response,
  ) {
    const clientVersion = clientVersionHeader
      ? parseInt(clientVersionHeader, 10) || undefined
      : undefined;
    const app = await this.sduiService.resolvePublicApp(appId);
    const screen = await this.sduiService.getPublicScreen(
      app.appId,
      slug,
      clientVersion,
      previewToken,
    );
    const etag = this.sduiService.computeEtag(
      JSON.stringify(screen.descriptor) + String(screen.publishedAt),
    );
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    const cacheControl =
      screen.cacheTtl > 0 ? `public, max-age=${screen.cacheTtl}` : 'no-store';
    res
      .set('ETag', `"${etag}"`)
      .set('Cache-Control', cacheControl)
      .json({ success: true, statusCode: 200, data: screen });
  }

  /**
   * Unified Flutter bootstrap endpoint, scoped by ?appId=.
   * Cached per-app under {appId}:app:config, TTL 60s.
   */
  @Get('app-config')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({
    summary: 'Unified app bootstrap config for Flutter (cached 60s)',
  })
  @ApiQuery({ name: 'appId', required: true, type: String })
  async getAppConfig(
    @Query('appId') appId: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    const app = await this.sduiService.resolvePublicApp(appId);
    const config = await this.sduiService.getAppConfig(app.appId);
    const etag = this.sduiService.computeEtag(
      String(config['version']) + String(config['publishedAt']),
    );
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    res
      .set('ETag', `"${etag}"`)
      .set('Cache-Control', 'public, max-age=60')
      .json({ success: true, statusCode: 200, data: config });
  }
}

// ── Versioned alias: /sdui/v1/* ───────────────────────────────────────────────
// Forwards identically to SduiPublicController; clients pinning to /sdui/v1/
// will remain unaffected when the unversioned /sdui/* paths change in future.

@ApiTags('SDUI — Public')
@Controller('sdui/v1')
export class SduiV1PublicController {
  constructor(
    private readonly sduiService: SduiService,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('health')
  @Throttle({ default: { ttl: 10_000, limit: 10 } })
  @ApiOperation({ summary: 'SDUI health check — DB + cache liveness (v1)' })
  async health(@Res() res: Response) {
    const checks: Record<string, 'ok' | 'error'> = {};
    try {
      await this.dataSource.query('SELECT 1');
      checks['db'] = 'ok';
    } catch {
      checks['db'] = 'error';
    }
    try {
      checks['cache'] = (await this.cache.isHealthy()) ? 'ok' : 'error';
    } catch {
      checks['cache'] = 'error';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    res
      .status(allOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ success: allOk, data: checks });
  }

  @Get('manifest')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Get mobile navigation manifest (v1)' })
  @ApiQuery({ name: 'appId', required: true, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async getManifest(
    @Query('appId') appId: string | undefined,
    @Query('role') role: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('x-sdui-client-version') clientVersionHeader: string | undefined,
    @Res() res: Response,
  ) {
    const clientVersion = clientVersionHeader
      ? parseInt(clientVersionHeader, 10) || undefined
      : undefined;
    const app = await this.sduiService.resolvePublicApp(appId);
    const { screens, etag } = await this.sduiService.getManifest(
      app.appId,
      role,
      clientVersion,
    );
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    res
      .set('ETag', `"${etag}"`)
      .set('Cache-Control', 'public, max-age=60')
      .json({ success: true, statusCode: 200, data: screens });
  }

  @Get('screens/:slug')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: 'Get a published screen by slug (v1)' })
  @ApiQuery({ name: 'appId', required: true, type: String })
  @ApiQuery({ name: 'preview', required: false, type: String })
  async getScreen(
    @Param('slug') slug: string,
    @Query('appId') appId: string | undefined,
    @Query('preview') previewToken: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('x-sdui-client-version') clientVersionHeader: string | undefined,
    @Res() res: Response,
  ) {
    const clientVersion = clientVersionHeader
      ? parseInt(clientVersionHeader, 10) || undefined
      : undefined;
    const app = await this.sduiService.resolvePublicApp(appId);
    const screen = await this.sduiService.getPublicScreen(
      app.appId,
      slug,
      clientVersion,
      previewToken,
    );
    const etag = this.sduiService.computeEtag(
      JSON.stringify(screen.descriptor) + String(screen.publishedAt),
    );
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    const cacheControl =
      screen.cacheTtl > 0 ? `public, max-age=${screen.cacheTtl}` : 'no-store';
    res
      .set('ETag', `"${etag}"`)
      .set('Cache-Control', cacheControl)
      .json({ success: true, statusCode: 200, data: screen });
  }

  @Get('app-config')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Unified app bootstrap config for Flutter (v1)' })
  @ApiQuery({ name: 'appId', required: true, type: String })
  async getAppConfig(
    @Query('appId') appId: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    const app = await this.sduiService.resolvePublicApp(appId);
    const config = await this.sduiService.getAppConfig(app.appId);
    const etag = this.sduiService.computeEtag(
      String(config['version']) + String(config['publishedAt']),
    );
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    res
      .set('ETag', `"${etag}"`)
      .set('Cache-Control', 'public, max-age=60')
      .json({ success: true, statusCode: 200, data: config });
  }
}

// ── Admin: force-publish endpoint ─────────────────────────────────────────────

@ApiTags('Admin — SDUI')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui')
export class SduiAdminPublishController {
  constructor(
    private readonly sduiService: SduiService,
    @Inject(SDUI_AUDIT_PROVIDER) private readonly auditLog: SduiAuditPort,
  ) {}

  @Post('force-publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Force-invalidate all SDUI caches and increment version for an app',
  })
  async forcePublish(
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    await Promise.all([
      this.sduiService.invalidateManifest(appId),
      this.sduiService.invalidateAppConfig(appId),
    ]);
    this.auditLog.record(actor.actorId, 'force_publish_sdui', undefined, 'sdui');
  }
}
