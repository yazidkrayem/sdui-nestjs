import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateFromTemplateDto {
  @IsString()
  @MinLength(1)
  templateId: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9 _-]+$/, {
    message:
      'Name must contain only letters, numbers, spaces, dashes, underscores',
  })
  name: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Slug must contain only letters, numbers, dashes, underscores',
  })
  slug: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];
}
