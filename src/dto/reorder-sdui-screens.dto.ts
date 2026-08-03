import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Matches, Min, ValidateNested } from 'class-validator';

export class ReorderItemDto {
  @ApiProperty()
  // UUID-shaped, but deliberately not @IsUUID(): the SDUI seed uses fixed ids
  // like 00000001-0000-0000-0000-000000000001 whose version/variant nibbles
  // are not RFC-valid, so @IsUUID() rejects them. The service ignores ids
  // that do not belong to the app, so the looser shape check is safe.
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { message: 'id must be a UUID-shaped string' },
  )
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderSduiScreensDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  screens: ReorderItemDto[];
}
