import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AppIdRequest } from '../guards/app-id.guard';

export const CurrentAppId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AppIdRequest>();
    return request.resolvedAppId ?? '';
  },
);
