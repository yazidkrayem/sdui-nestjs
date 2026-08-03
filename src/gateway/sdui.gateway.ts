import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * Lightweight gateway used only to broadcast SDUI config-update events to
 * mobile clients.  No auth — the event carries only a version number so
 * clients know whether to re-fetch; no sensitive data is pushed.
 *
 * Mobile clients: connect to /sdui-config, listen for 'sdui:config_updated'.
 * On receipt, trigger RefreshAppConfig if event.appId matches their appId.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/sdui-config',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class SduiGateway {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(SduiGateway.name);

  notifyConfigUpdated(appId: string, version: number): void {
    try {
      this.server.emit('sdui:config_updated', { appId, version });
      this.logger.debug(
        `Emitted sdui:config_updated for app=${appId} v=${version}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to emit sdui:config_updated: ${(err as Error).message}`,
      );
    }
  }
}
