import { PartialType } from '@nestjs/mapped-types';
import { CreateSduiScreenDto } from './create-sdui-screen.dto';

export class UpdateSduiScreenDto extends PartialType(CreateSduiScreenDto) {}
