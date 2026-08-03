export * from './app.entity';
export * from './app-strings.entity';
export * from './sdui-nav-config.entity';
export * from './sdui-screen.entity';
export * from './sdui-screen-version.entity';
export * from './sdui-error-report.entity';

import { App } from './app.entity';
import { AppStrings } from './app-strings.entity';
import { SduiNavConfig } from './sdui-nav-config.entity';
import { SduiScreen } from './sdui-screen.entity';
import { SduiScreenVersion } from './sdui-screen-version.entity';
import { SduiErrorReport } from './sdui-error-report.entity';

/** Convenience array for `TypeOrmModule.forFeature(SDUI_ENTITIES)`. */
export const SDUI_ENTITIES = [
  App,
  AppStrings,
  SduiNavConfig,
  SduiScreen,
  SduiScreenVersion,
  SduiErrorReport,
];
