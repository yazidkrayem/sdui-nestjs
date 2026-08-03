import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IsNull } from 'typeorm';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SduiScreen } from '../entities/sdui-screen.entity';
import { SduiCachePort } from '../interfaces/sdui-cache.port';
import { SDUI_CACHE_PROVIDER } from '../constants/tokens';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiService } from '../services/sdui.service';

const PREVIEW_TOKEN_TTL = 86_400; // 24 hours

// ── Admin: generate preview token ─────────────────────────────────────────────

@ApiTags('Admin — SDUI')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui')
export class SduiPreviewAdminController {
  constructor(
    @InjectRepository(SduiScreen)
    private readonly repo: Repository<SduiScreen>,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
  ) {}

  @Post(':id/preview-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Generate a 24h preview token for a draft screen (for device testing)',
  })
  async createPreviewToken(
    @Param('id') id: string,
    @CurrentAppId() appId: string,
  ) {
    const screen = await this.repo.findOne({
      where: { appId, id, deletedAt: IsNull() },
    });
    if (!screen) throw new NotFoundException('SDUI screen not found');

    const token = `prev_${randomBytes(16).toString('hex')}`;
    const tokenData = JSON.stringify({ screenId: screen.id, appId });

    try {
      await this.cache.set(
        `sdui:preview:${token}`,
        tokenData,
        PREVIEW_TOKEN_TTL,
      );
    } catch {
      throw new Error('Cache unavailable — cannot issue preview token');
    }

    const expiresAt = new Date(Date.now() + PREVIEW_TOKEN_TTL * 1000);

    return {
      token,
      slug: screen.slug,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

// ── Public: resolve preview token ─────────────────────────────────────────────

@ApiTags('SDUI — Public')
@Controller('sdui')
export class SduiPreviewPublicController {
  constructor(
    private readonly sduiService: SduiService,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
  ) {}

  @Get('preview/:token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({
    summary: 'Resolve a preview token and return the screen descriptor',
  })
  @ApiQuery({ name: 'appId', required: true, type: String })
  async resolvePreview(
    @Param('token') token: string,
    @Query('appId') appId: string | undefined,
  ) {
    const app = await this.sduiService.resolvePublicApp(appId);

    let tokenData: { screenId: string; appId: string } | null = null;
    try {
      const raw = await this.cache.get(`sdui:preview:${token}`);
      if (raw)
        tokenData = JSON.parse(raw) as { screenId: string; appId: string };
    } catch {
      // non-fatal
    }

    if (!tokenData || tokenData.appId !== app.appId) {
      throw new NotFoundException('Preview token not found or expired');
    }

    // Delegate to the existing getPublicScreen preview path
    const screen = await this.sduiService.resolvePreviewById(
      app.appId,
      tokenData.screenId,
    );

    return { success: true, statusCode: 200, data: screen };
  }
}
