import { PartialType } from '@nestjs/swagger';
import { CreateGenDto } from './create-gen.dto';

export class UpdateGenDto extends PartialType(CreateGenDto) {}
