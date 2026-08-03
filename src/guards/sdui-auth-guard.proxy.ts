import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SDUI_AUTH_GUARD } from '../constants/tokens';

/**
 * `@UseGuards()` needs a class, but the concrete auth guard is only known at
 * `SduiModule.forRoot()` time via a DI token. This proxy is the fixed class
 * every controller references; it just delegates to whatever the host (or
 * the default SduiAllowAllGuard) registered under SDUI_AUTH_GUARD.
 */
@Injectable()
export class SduiAuthGuardProxy implements CanActivate {
  constructor(
    @Inject(SDUI_AUTH_GUARD) private readonly guard: CanActivate,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.guard.canActivate(context);
  }
}
