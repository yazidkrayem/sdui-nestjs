import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Default SDUI auth guard used when the host supplies none. Attaches an
 * actor that bypasses permission checks and lets every request through.
 * Never use this once real admin users exist — supply `authGuard` in
 * SduiModule.forRoot() instead.
 */
@Injectable()
export class SduiAllowAllGuard implements CanActivate {
  private static warned = false;
  private readonly logger = new Logger(SduiAllowAllGuard.name);

  canActivate(context: ExecutionContext): boolean {
    if (!SduiAllowAllGuard.warned) {
      SduiAllowAllGuard.warned = true;
      this.logger.warn(
        'SduiModule is running with the default allow-all auth guard — ' +
          'every request is treated as an authenticated super-admin. ' +
          'Supply `authGuard` in SduiModule.forRoot() before deploying.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    request.sduiActor = { actorId: 'anonymous', bypassPermissionChecks: true };
    return true;
  }
}
