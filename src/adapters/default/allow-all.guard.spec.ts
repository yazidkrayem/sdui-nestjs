import { ExecutionContext } from '@nestjs/common';
import { SduiAllowAllGuard } from './allow-all.guard';

function mockContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('SduiAllowAllGuard', () => {
  beforeEach(() => {
    // reset the module-level "warned once" static between tests
    (SduiAllowAllGuard as unknown as { warned: boolean }).warned = false;
  });

  it('always allows the request', () => {
    const guard = new SduiAllowAllGuard();
    const request: Record<string, unknown> = {};
    expect(guard.canActivate(mockContext(request))).toBe(true);
  });

  it('attaches a super-admin actor that bypasses permission checks', () => {
    const guard = new SduiAllowAllGuard();
    const request: Record<string, unknown> = {};
    guard.canActivate(mockContext(request));
    expect(request.sduiActor).toEqual({
      actorId: 'anonymous',
      bypassPermissionChecks: true,
    });
  });

  it('only logs the startup warning once across multiple requests', () => {
    const guard = new SduiAllowAllGuard();
    const warnSpy = jest
      .spyOn((guard as unknown as { logger: { warn: () => void } }).logger, 'warn')
      .mockImplementation(() => undefined);

    guard.canActivate(mockContext({}));
    guard.canActivate(mockContext({}));
    guard.canActivate(mockContext({}));

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
