import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { App } from '../entities/app.entity';

export interface AppIdRequest extends Request {
  resolvedAppId?: string;
}

@Injectable()
export class AppIdGuard implements CanActivate {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<AppIdRequest>();
    const appId = request.headers['x-app-id'] as string | undefined;
    if (!appId?.trim()) {
      throw new BadRequestException(
        'MISSING_APP_ID: X-App-Id header is required',
      );
    }
    const app = await this.appRepo.findOne({
      where: { appId: appId.trim() },
    });
    if (!app || app.deletedAt) {
      throw new NotFoundException('APP_NOT_FOUND');
    }
    if (app.status === 'suspended') {
      throw new ForbiddenException('APP_SUSPENDED');
    }
    if (app.status === 'archived') {
      throw new NotFoundException('APP_NOT_FOUND');
    }
    request.resolvedAppId = app.appId;
    return true;
  }
}
