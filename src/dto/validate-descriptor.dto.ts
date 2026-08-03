import { IsObject } from 'class-validator';

export class ValidateDescriptorDto {
  @IsObject()
  descriptor: Record<string, unknown>;
}
