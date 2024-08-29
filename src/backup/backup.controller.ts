import { Controller, Get, Query } from '@nestjs/common';
import { BackupService } from './backup.service';
import {Public} from "../common/public/public.decorator";

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @Public()
  async exportDatabase(@Query('dbName') dbName: string) {
    await this.backupService.exportDatabase(dbName);
    return { message: `数据库 ${dbName} 已导出到当前目录下的 "mongodb" 文件夹` };
  }

  @Get('import')
  async importDatabase(@Query('dbName') dbName: string) {
    await this.backupService.importDatabase(dbName);
    return { message: `数据库 ${dbName} 已从当前目录下的 "mongodb" 文件夹导入` };
  }
}
