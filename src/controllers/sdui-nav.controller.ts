import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { SduiActor } from '../interfaces/sdui-actor.interface';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiNavService } from '../services/sdui-nav.service';
import { SduiService } from '../services/sdui.service';
import { UpdateNavDto } from '../dto/update-nav.dto';

// ── Admin nav controller ──────────────────────────────────────────────────────

@ApiTags('Admin — SDUI Nav')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui/nav')
export class SduiNavAdminController {
  constructor(private readonly navService: SduiNavService) {}

  @Get()
  @ApiOperation({ summary: 'Get current navigation config' })
  getNav(@CurrentAppId() appId: string) {
    return this.navService.getNav(appId);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update navigation config (full replace of JSONB fields)',
  })
  updateNav(
    @Body() dto: UpdateNavDto,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.navService.updateNav(appId, dto, actor.actorId);
  }
}

// ── Public nav controller ─────────────────────────────────────────────────────

@ApiTags('SDUI — Public')
@Controller('sdui')
export class SduiNavPublicController {
  constructor(
    private readonly navService: SduiNavService,
    private readonly sduiService: SduiService,
  ) {}

  @Get('nav')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: 'Get navigation config (public, cached 60s)' })
  @ApiQuery({ name: 'appId', required: true, type: String })
  async getNav(@Query('appId') appId: string | undefined) {
    const app = await this.sduiService.resolvePublicApp(appId);
    return this.navService.getNav(app.appId);
  }
}
