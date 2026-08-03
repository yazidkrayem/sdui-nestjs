import { DynamicModule, Module, Provider } from '@nestjs/common';
import { SduiPushController } from './sdui-push.controller';
import {
  SDUI_PUSH_PROVIDER,
  SDUI_DEVICE_TOKEN_PROVIDER,
} from '../constants/tokens';
import { SduiPushModuleOptions } from '../interfaces/sdui-module-options.interface';

/**
 * Optional companion to SduiModule — only import this if the host wants
 * SDUI to be able to send push notifications. Requires both a push sender
 * and a device-token lookup; SDUI has no built-in notion of either (see
 * sdui-push.port.ts) since "devices" and delivery providers vary per host.
 */
@Module({})
export class SduiPushModule {
  static forRoot(options: SduiPushModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: SDUI_PUSH_PROVIDER, ...options.push } as Provider,
      { provide: SDUI_DEVICE_TOKEN_PROVIDER, ...options.deviceTokens } as Provider,
    ];

    return {
      module: SduiPushModule,
      controllers: [SduiPushController],
      providers,
    };
  }
}
