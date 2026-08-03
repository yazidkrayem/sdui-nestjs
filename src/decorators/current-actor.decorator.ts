import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { SduiActor } from '../interfaces/sdui-actor.interface';

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SduiActor => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.sduiActor as SduiActor;
  },
);
