import { Injectable } from '@nestjs/common';
import { SduiAuditPort } from '../../interfaces/sdui-audit.port';

/** Default SduiAuditPort used when the host supplies none — discards entries. */
@Injectable()
export class SduiNoopAuditAdapter implements SduiAuditPort {
  record(): void {
    // intentionally discarded
  }
}
