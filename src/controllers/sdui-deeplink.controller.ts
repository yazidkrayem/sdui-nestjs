import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SduiScreen, SduiScreenStatus } from '../entities/sdui-screen.entity';
import { SduiService } from '../services/sdui.service';
import { SDUI_DEEPLINK_BASE_URL } from '../constants/tokens';

@ApiTags('SDUI — Public')
@Controller('sdui')
export class SduiDeepLinkController {
  constructor(
    @InjectRepository(SduiScreen)
    private readonly repo: Repository<SduiScreen>,
    private readonly sduiService: SduiService,
    @Optional()
    @Inject(SDUI_DEEPLINK_BASE_URL)
    private readonly deepLinkBaseUrl: string | undefined,
  ) {}

  /**
   * Resolve a screen slug into canonical deep-link URLs.
   *
   * Flutter share actions call this to get a stable sharable URL.
   * Returns both the custom app scheme and, if `deepLinkBaseUrl` was
   * configured in SduiModule.forRoot(), the Universal Link / App Link form.
   */
  @Get('link/:slug')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({
    summary:
      'Get canonical deep-link URLs for a published screen (app scheme + universal)',
  })
  @ApiQuery({ name: 'appId', required: true, type: String })
  @ApiQuery({
    name: 'params',
    required: false,
    description: 'URL-encoded JSON params to embed in the link',
  })
  async resolveLink(
    @Param('slug') slug: string,
    @Query('appId') appId: string | undefined,
    @Query('params') params: string | undefined,
  ) {
    const app = await this.sduiService.resolvePublicApp(appId);

    const screen = await this.repo.findOne({
      where: {
        appId: app.appId,
        slug,
        status: SduiScreenStatus.PUBLISHED,
        deletedAt: IsNull(),
      },
      select: { id: true, slug: true, name: true, authRequired: true },
    });
    if (!screen)
      throw new NotFoundException('Screen not found or not published');

    const encodedParams = params ? encodeURIComponent(params) : '';
    const paramsSuffix = encodedParams ? `&params=${encodedParams}` : '';

    return {
      success: true,
      statusCode: 200,
      data: {
        slug: screen.slug,
        name: screen.name,
        appId: app.appId,
        authRequired: screen.authRequired ?? false,
        appScheme: `${app.appId}://screens/${screen.slug}?appId=${app.appId}${paramsSuffix}`,
        ...(this.deepLinkBaseUrl && {
          universalUrl: `${this.deepLinkBaseUrl}/screens/${screen.slug}?appId=${app.appId}${paramsSuffix}`,
        }),
      },
    };
  }
}
