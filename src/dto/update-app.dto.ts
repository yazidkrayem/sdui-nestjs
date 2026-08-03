import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAppDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string | null;
}

export class UpdateAppStatusDto {
  @IsIn(['active', 'suspended', 'archived'])
  status: 'active' | 'suspended' | 'archived';
}
