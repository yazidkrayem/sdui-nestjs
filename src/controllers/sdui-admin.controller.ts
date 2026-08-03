import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { SduiActor } from '../interfaces/sdui-actor.interface';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiService } from '../services/sdui.service';
import { CreateSduiScreenDto } from '../dto/create-sdui-screen.dto';
import { UpdateSduiScreenDto } from '../dto/update-sdui-screen.dto';
import { ReorderSduiScreensDto } from '../dto/reorder-sdui-screens.dto';
import { CreateFromTemplateDto } from '../dto/create-from-template.dto';
import { ValidateDescriptorDto } from '../dto/validate-descriptor.dto';
import { SduiListQueryDto } from '../dto/sdui-query.dto';
import { UpdateVersionLabelDto } from '../dto/update-version-label.dto';

@ApiTags('Admin — SDUI')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui')
export class SduiAdminController {
  constructor(private readonly sduiService: SduiService) {}

  // ── Static routes (must precede /:id) ──────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List all screen templates' })
  getTemplates() {
    return this.sduiService.getTemplates();
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create a screen from a template' })
  createFromTemplate(
    @Body() dto: CreateFromTemplateDto,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.createFromTemplate(appId, dto, actor.actorId);
  }

  @Get('registry')
  @ApiOperation({ summary: 'Get the component registry (palette)' })
  getRegistry() {
    return this.sduiService.getRegistry();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a descriptor against the schema' })
  validateDescriptor(@Body() dto: ValidateDescriptorDto) {
    return this.sduiService.validateDescriptor(dto.descriptor);
  }

  @Get('stats')
  @ApiOperation({ summary: 'SDUI screen statistics' })
  getStats(@CurrentAppId() appId: string) {
    return this.sduiService.getStats(appId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder SDUI screens' })
  async reorder(
    @Body() dto: ReorderSduiScreensDto,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    await this.sduiService.reorder(appId, dto, actor.actorId);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'List soft-deleted SDUI screens (recoverable)' })
  findDeleted(@CurrentAppId() appId: string) {
    return this.sduiService.findDeleted(appId);
  }

  // ── Collection ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all SDUI screens (paginated)' })
  findAll(@Query() query: SduiListQueryDto, @CurrentAppId() appId: string) {
    return this.sduiService.findAll(appId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create an SDUI screen' })
  create(
    @Body() dto: CreateSduiScreenDto,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.create(appId, dto, actor.actorId);
  }

  // ── Item ──────────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single SDUI screen' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.findOne(appId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an SDUI screen' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSduiScreenDto,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.update(appId, id, dto, actor.actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an SDUI screen' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    await this.sduiService.softDelete(appId, id, actor.actorId);
  }

  @Post(':id/restore-deleted')
  @ApiOperation({ summary: 'Restore a soft-deleted screen back to DRAFT' })
  restoreDeleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.restoreDeleted(appId, id, actor.actorId);
  }

  // ── Publish flow ──────────────────────────────────────────────────────────

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an SDUI screen' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.publish(appId, id, actor.actorId);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish (set to DRAFT) an SDUI screen' })
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.unpublish(appId, id, actor.actorId);
  }

  @Post(':id/archive')
  @ApiOperation({
    summary: 'Archive an SDUI screen (must be unpublished first)',
  })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.archive(appId, id, actor.actorId);
  }

  // ── Version history ───────────────────────────────────────────────────────

  @Get(':id/versions')
  @ApiOperation({ summary: 'List version history for a screen' })
  getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.getVersions(appId, id);
  }

  @Patch(':id/versions/:versionId')
  @ApiOperation({ summary: 'Update version label' })
  updateVersionLabel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateVersionLabelDto,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.updateVersionLabel(appId, id, versionId, dto.label);
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore a previous version' })
  restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentActor() actor: SduiActor,
    @CurrentAppId() appId: string,
  ) {
    return this.sduiService.restoreVersion(appId, id, versionId, actor.actorId);
  }

  @Delete(':id/versions/:versionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a version (cannot delete active version)' })
  async deleteVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAppId() appId: string,
  ) {
    await this.sduiService.deleteVersion(appId, id, versionId);
  }
}
