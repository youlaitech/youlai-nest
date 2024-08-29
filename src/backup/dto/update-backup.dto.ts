import { PartialType } from '@nestjs/swagger';
import { CreateBackupDto } from './create-backup.dto';

export class UpdateBackupDto extends PartialType(CreateBackupDto) {}
