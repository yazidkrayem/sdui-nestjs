import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { CurrentActor } from '../decorators/current-actor.decorator';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { SduiActor } from '../interfaces/sdui-actor.interface';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiStringsService } from '../services/sdui-strings.service';
import { SduiService } from '../services/sdui.service';
import {
  ImportStringsDto,
  RenameStringKeyDto,
  SetStringKeysDto,
} from '../dto/strings.dto';

// ── Admin strings controller ──────────────────────────────────────────────────

@ApiTags('Admin — SDUI Strings')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui/strings')
export class SduiStringsAdminController {
  constructor(private readonly stringsService: SduiStringsService) {}

  /** Get all strings for both locales */
  @Get()
  @ApiOperation({ summary: 'Get all string keys for all locales' })
  getAll(@CurrentAppId() appId: string) {
    return this.stringsService.getAllStrings(appId);
  }

  /** Export all strings as { key: { en, ar } } map */
  @Get('export')
  @ApiOperation({ summary: 'Export strings as key → { en, ar } map' })
  export(@CurrentAppId() appId: string) {
    return this.stringsService.exportStrings(appId);
  }

  /** Import strings */
  @Post('import')
  @ApiOperation({ summary: 'Import strings from key → { en, ar } map' })
  async import(
    @CurrentAppId() appId: string,
    @Body() dto: ImportStringsDto,
    @CurrentActor() actor: SduiActor,
  ) {
    return this.stringsService.importStrings(
      appId,
      dto.data,
      dto.overwrite ?? false,
      actor.actorId,
    );
  }

  /** Rename a key across all locales */
  @Post('rename-key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rename a string key in all locales' })
  async renameKey(
    @CurrentAppId() appId: string,
    @Body() dto: RenameStringKeyDto,
    @CurrentActor() actor: SduiActor,
  ) {
    await this.stringsService.renameKey(
      appId,
      dto.oldKey,
      dto.newKey,
      actor.actorId,
    );
  }

  /** Delete a key from all locales */
  @Delete('key/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a string key from all locales' })
  async deleteKey(
    @CurrentAppId() appId: string,
    @Param('key') key: string,
    @CurrentActor() actor: SduiActor,
  ) {
    await this.stringsService.deleteKey(appId, key, actor.actorId);
  }

  /** Get strings for a specific locale */
  @Get(':locale')
  @ApiOperation({
    summary: 'Get all string keys for a specific locale (en|ar)',
  })
  getByLocale(@CurrentAppId() appId: string, @Param('locale') locale: string) {
    return this.stringsService.getStrings(appId, locale);
  }

  /** Bulk set keys for a locale */
  @Put(':locale')
  @ApiOperation({ summary: 'Bulk set string keys for a locale' })
  async setKeys(
    @CurrentAppId() appId: string,
    @Param('locale') locale: string,
    @Body() dto: SetStringKeysDto,
    @CurrentActor() actor: SduiActor,
  ) {
    await this.stringsService.setKeys(appId, locale, dto.keys, actor.actorId);
  }
}

// ── Public strings controller ─────────────────────────────────────────────────

@ApiTags('SDUI — Public')
@Controller('sdui')
export class SduiStringsPublicController {
  constructor(
    private readonly stringsService: SduiStringsService,
    private readonly sduiService: SduiService,
  ) {}

  @Get('strings')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: 'Get strings for a locale (public)' })
  @ApiQuery({ name: 'appId', required: true, type: String })
  @ApiQuery({ name: 'locale', required: false, type: String })
  async getStrings(
    @Query('appId') appId: string | undefined,
    @Query('locale') locale: string | undefined,
  ) {
    const app = await this.sduiService.resolvePublicApp(appId);
    return this.stringsService.getStrings(app.appId, locale ?? 'en');
  }
}
