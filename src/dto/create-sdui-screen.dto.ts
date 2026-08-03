import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSduiScreenDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9 _-]+$/, {
    message:
      'name may only contain letters, numbers, spaces, hyphens and underscores',
  })
  name: string;

  @ApiProperty({ example: 'home' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'slug may only contain letters, numbers, hyphens and underscores',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['SUPER_ADMIN'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ example: { components: [] } })
  @IsOptional()
  @IsObject()
  descriptor?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  schemaVersion?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  authRequired?: boolean;

  @ApiPropertyOptional({
    example: 'login',
    description:
      'Screen slug to redirect unauthenticated users; null = use global authRedirect',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirectIfUnauth?: string | null;
}
