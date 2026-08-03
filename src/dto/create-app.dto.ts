import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreateAppDto {
  /** Immutable slug: 3-32 chars, lowercase alphanumeric or hyphens, must start and end with alphanumeric. Mirrors the DB CHECK constraint. */
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/, {
    message:
      'appId must be 3–32 chars, lowercase alphanumeric/hyphens, and must not start or end with a hyphen',
  })
  appId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** CSS hex color, e.g. #3B82F6 */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;
}
