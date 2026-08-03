import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { NavConfig } from '../entities/sdui-nav-config.entity';

const NAV_TYPES = ['bottomNav', 'drawer', 'tabBar', 'combined'] as const;

export class UpdateNavDto {
  @IsOptional()
  @IsIn(NAV_TYPES)
  navType?: 'bottomNav' | 'drawer' | 'tabBar' | 'combined';

  @IsOptional()
  @IsObject()
  bottomNav?: NavConfig | null;

  @IsOptional()
  @IsObject()
  drawer?: NavConfig | null;

  @IsOptional()
  @IsObject()
  tabBar?: NavConfig | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  initialRoute?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authRedirect?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  postLoginRedirect?: string | null;
}
