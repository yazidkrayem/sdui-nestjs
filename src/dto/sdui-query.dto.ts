import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';
import { SduiScreenStatus } from '../entities/sdui-screen.entity';

export class SduiListQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SduiScreenStatus)
  status?: SduiScreenStatus;
}
