import { RedesignSduiScreens1779776480003 } from './1779776480003-RedesignSduiScreens';
import { SduiPublishingAndVersions1779776480004 } from './1779776480004-SduiPublishingAndVersions';
import { SduiSession61779776480005 } from './1779776480005-SduiSession6';
import { SduiSession71779776480006 } from './1779776480006-SduiSession7';
import { SduiSession81779776480007 } from './1779776480007-SduiSession8';
import { SduiAppIdCheckConstraint1779776480008 } from './1779776480008-SduiAppIdCheckConstraint';
import { SduiErrorReports1779776480009 } from './1779776480009-SduiErrorReports';
import { SduiPreAuth1779776480010 } from './1779776480010-SduiPreAuth';
import { SduiSeededAt1779776480012 } from './1779776480012-SduiSeededAt';
import { FixSduiSeededAtType1779776480013 } from './1779776480013-FixSduiSeededAtType';

/**
 * Ordered migration set for a fresh host database (no prior InitSchema).
 * Requires the `uuid-ossp` Postgres extension for `uuid_generate_v4()`.
 * The scaffolding CLI copies these into the host's own migrations folder
 * rather than running them cross-package — see README.md.
 */
export const SDUI_MIGRATIONS = [
  RedesignSduiScreens1779776480003,
  SduiPublishingAndVersions1779776480004,
  SduiSession61779776480005,
  SduiSession71779776480006,
  SduiSession81779776480007,
  SduiAppIdCheckConstraint1779776480008,
  SduiErrorReports1779776480009,
  SduiPreAuth1779776480010,
  SduiSeededAt1779776480012,
  FixSduiSeededAtType1779776480013,
];
