import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import {
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RequireSduiPermission } from '../decorators/require-permission.decorator';
import { SduiAuthGuardProxy } from '../guards/sdui-auth-guard.proxy';
import { SduiPermissionGuard } from '../guards/sdui-permission.guard';
import { AppIdGuard } from '../guards/app-id.guard';
import { CurrentAppId } from '../decorators/current-app-id.decorator';
import { SduiErrorReport } from '../entities/sdui-error-report.entity';
import { PaginationDto } from '../dto/pagination.dto';

class ReportErrorDto {
  @IsString()
  @MaxLength(64)
  appId: string;

  @IsString()
  @MaxLength(64)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nodeId?: string;

  @IsString()
  @MaxLength(2000)
  error: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  schemaVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}

// ── Public: client reports rendering errors ───────────────────────────────────

@ApiTags('SDUI — Public')
@Controller('sdui')
export class SduiErrorReportPublicController {
  constructor(
    @InjectRepository(SduiErrorReport)
    private readonly repo: Repository<SduiErrorReport>,
  ) {}

  @Post('error-report')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Report a client-side SDUI rendering error' })
  async report(@Body() dto: ReportErrorDto) {
    const nodeIdCondition = dto.nodeId ? dto.nodeId : IsNull();
    const existing = await this.repo.findOne({
      where: {
        appId: dto.appId,
        slug: dto.slug,
        nodeId: nodeIdCondition as string,
        errorHash: this._hash(dto.error),
      },
    });
    if (existing) {
      // Dedup: increment count + update timestamp instead of creating a new row
      existing.count += 1;
      existing.lastSeenAt = new Date();
      await this.repo.save(existing);
      return;
    }

    const report = this.repo.create({
      appId: dto.appId,
      slug: dto.slug,
      nodeId: dto.nodeId ?? null,
      error: dto.error.slice(0, 2000),
      errorHash: this._hash(dto.error),
      schemaVersion: dto.schemaVersion ?? null,
      platform: dto.platform ?? null,
      appVersion: dto.appVersion ?? null,
    });
    await this.repo.save(report);
  }

  private _hash(s: string): string {
    let h = 0;
    for (let i = 0; i < Math.min(s.length, 256); i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return String(h >>> 0);
  }
}

// ── Admin: view error reports ─────────────────────────────────────────────────

@ApiTags('Admin — SDUI')
@ApiBearerAuth()
@UseGuards(SduiAuthGuardProxy, SduiPermissionGuard, AppIdGuard)
@RequireSduiPermission('sdui:manage')
@SkipThrottle()
@Controller('admin/sdui')
export class SduiErrorReportAdminController {
  constructor(
    @InjectRepository(SduiErrorReport)
    private readonly repo: Repository<SduiErrorReport>,
  ) {}

  @Get('errors')
  @ApiOperation({ summary: 'List client-side SDUI errors for this app' })
  @ApiQuery({ name: 'slug', required: false })
  async list(
    @CurrentAppId() appId: string,
    @Query() query: PaginationDto & { slug?: string },
  ) {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.appId = :appId', { appId })
      .orderBy('e.lastSeenAt', 'DESC');

    if (query.slug) {
      qb.andWhere('e.slug = :slug', { slug: query.slug });
    }

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }
}
