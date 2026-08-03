import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const KEY_REGEX = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

export class SetStringKeyDto {
  @IsString()
  @MaxLength(128)
  @Matches(KEY_REGEX, {
    message:
      'key must match pattern: lowercase, digits, underscores, dot-separated segments',
  })
  key!: string;

  @IsString()
  value!: string;
}

export class SetStringKeysDto {
  @IsObject()
  @Transform(({ value }) => value as Record<string, string>)
  keys!: Record<string, string>;
}

export class RenameStringKeyDto {
  @IsString()
  @MaxLength(128)
  @Matches(KEY_REGEX, {
    message: 'key must match pattern',
  })
  oldKey!: string;

  @IsString()
  @MaxLength(128)
  @Matches(KEY_REGEX, {
    message: 'newKey must match pattern',
  })
  newKey!: string;
}

export class ImportStringsDto {
  /** { "screen.node.prop": { en: "...", ar: "..." } } */
  @IsObject()
  @Transform(({ value }) => value as Record<string, { en: string; ar: string }>)
  data!: Record<string, { en: string; ar: string }>;

  /** When true, existing keys will be overwritten. Default false. */
  @IsOptional()
  overwrite?: boolean;
}

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export class LocaleParamDto {
  @IsEnum(['en', 'ar'], { message: 'locale must be en or ar' })
  locale!: SupportedLocale;
}
