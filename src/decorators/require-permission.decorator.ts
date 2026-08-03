import { SetMetadata } from '@nestjs/common';

export const SDUI_PERMISSION_KEY = 'sdui:permission';
export const RequireSduiPermission = (permission: string) =>
  SetMetadata(SDUI_PERMISSION_KEY, permission);
