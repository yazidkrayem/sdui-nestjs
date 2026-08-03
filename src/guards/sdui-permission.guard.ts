import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SDUI_PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Generic replacement for the host's PermissionGuard. Reads the SduiActor the
 * auth guard attached to the request — has no notion of admin roles, only
 * the actor's `permissions` list / `bypassPermissionChecks` flag.
 */
@Injectable()
export class SduiPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(
      SDUI_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const actor = request.sduiActor;

    if (actor?.bypassPermissionChecks) return true;

    if (!actor?.permissions?.includes(required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }
    return true;
  }
}
