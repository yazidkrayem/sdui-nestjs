import { IsString, MaxLength } from 'class-validator';

export class UpdateVersionLabelDto {
  @IsString()
  @MaxLength(200)
  label: string;
}
