import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiPushPort, SduiDeviceTokenPort } from '../interfaces/sdui-push.port';
import {
  SDUI_PUSH_PROVIDER,
  SDUI_DEVICE_TOKEN_PROVIDER,
} from '../constants/tokens';

/** Notification type determines the deep-link the app opens on tap. */
export enum SduiPushType {
  NAVIGATE = 'sdui_navigate',
  RELOAD = 'sdui_reload',
  INVALIDATE = 'sdui_invalidate',
}

class SendSduiPushDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(512)
  body: string;

  @IsEnum(SduiPushType)
  type: SduiPushType;

  /** SDUI screen slug to navigate to on tap (used with NAVIGATE type). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  route?: string;

  /** JSON-serialised params passed to the target screen. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  params?: string;

  /** Target specific users. If omitted, sends to every token SduiDeviceTokenPort returns. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUserIds?: string[];

  /** Slug to invalidate in the local cache (used with INVALIDATE type). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cacheInvalidate?: string;
}

/**
 * Optional — only registered if the host imports SduiPushModule and supplies
 * both SDUI_PUSH_PROVIDER and SDUI_DEVICE_TOKEN_PROVIDER. SDUI has no opinion
 * on how "devices" or push delivery are modeled; see sdui-push.port.ts.
 */
@ApiTags('Admin — SDUI')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui')
export class SduiPushController {
  constructor(
    @Inject(SDUI_PUSH_PROVIDER) private readonly pushService: SduiPushPort,
    @Inject(SDUI_DEVICE_TOKEN_PROVIDER)
    private readonly deviceTokens: SduiDeviceTokenPort,
  ) {}

  @Post('push')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Send a push notification that deep-links into an SDUI screen',
  })
  async sendPush(@Body() dto: SendSduiPushDto, @CurrentAppId() appId: string) {
    const data: Record<string, string> = {
      type: dto.type,
      appId,
    };
    if (dto.route) data['route'] = dto.route;
    if (dto.params) data['params'] = dto.params;
    if (dto.cacheInvalidate) data['cacheInvalidate'] = dto.cacheInvalidate;

    const tokens = await this.deviceTokens.listTokens(dto.targetUserIds);

    if (tokens.length === 0) {
      return { sent: 0, message: 'No registered device tokens found' };
    }

    const { invalidTokens } = await this.pushService.sendToTokens(
      tokens,
      dto.title,
      dto.body,
      data,
    );

    if (invalidTokens.length > 0) {
      await this.deviceTokens.invalidateTokens(invalidTokens);
    }

    return {
      sent: tokens.length - invalidTokens.length,
      failed: invalidTokens.length,
    };
  }
}
