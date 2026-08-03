import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { SduiActor } from '../interfaces/sdui-actor.interface';
import { SduiAppsService } from '../services/sdui-apps.service';
import { CreateAppDto } from '../dto/create-app.dto';
import { UpdateAppDto, UpdateAppStatusDto } from '../dto/update-app.dto';

@ApiTags('Admin — SDUI Apps')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui/apps')
export class SduiAppsController {
  constructor(private readonly appsService: SduiAppsService) {}

  @Get()
  @ApiOperation({ summary: 'List all apps with screen counts' })
  findAll() {
    return this.appsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new app' })
  create(@Body() dto: CreateAppDto, @CurrentActor() actor: SduiActor) {
    return this.appsService.create(dto, actor.actorId);
  }

  @Get(':appId')
  @ApiOperation({ summary: 'Get single app with stats' })
  findOne(@Param('appId') appId: string) {
    return this.appsService.findOne(appId);
  }

  @Patch(':appId')
  @ApiOperation({
    summary: 'Update app metadata (name, description, icon, color)',
  })
  update(
    @Param('appId') appId: string,
    @Body() dto: UpdateAppDto,
    @CurrentActor() actor: SduiActor,
  ) {
    return this.appsService.update(appId, dto, actor.actorId);
  }

  @Patch(':appId/status')
  @ApiOperation({ summary: 'Suspend, reactivate, or archive an app' })
  updateStatus(
    @Param('appId') appId: string,
    @Body() dto: UpdateAppStatusDto,
    @CurrentActor() actor: SduiActor,
  ) {
    return this.appsService.updateStatus(appId, dto, actor.actorId);
  }

  @Delete(':appId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete an app (rejected if has PUBLISHED screens)',
  })
  async delete(@Param('appId') appId: string, @CurrentActor() actor: SduiActor) {
    await this.appsService.softDelete(appId, actor.actorId);
  }
}
