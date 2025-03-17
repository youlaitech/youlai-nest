import { Injectable } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdirSync } from "fs";

const execPromise = promisify(exec);

@Injectable()
export class BackupService {
  // 导出整个数据库并保存在当前目录下的 "mongodb" 文件夹
  async exportDatabase(dbName: string): Promise<void> {
    const outputPath = "./mongodb"; // 指定输出路径为当前目录下的 "mongodb" 文件夹

    try {
      // 创建目录（如果不存在）
      mkdirSync(outputPath, { recursive: true });

      // 执行 mongodump 命令导出数据库
      const command = `mongodump --db ${dbName} --out ${outputPath}`;
      await execPromise(command);
      console.log(`数据库 ${dbName} 已成功导出到 ${outputPath}`);
    } catch (error) {
      console.error("导出数据库时发生错误:", error);
    }
  }

  // 从当前目录下的 "mongodb" 文件夹导入整个数据库
  async importDatabase(dbName: string): Promise<void> {
    const inputPath = "./mongodb"; // 指定输入路径为当前目录下的 "mongodb" 文件夹

    try {
      // 执行 mongorestore 命令导入数据库
      const command = `mongorestore --db ${dbName} ${inputPath}/${dbName}`;
      await execPromise(command);
      console.log(`数据库 ${dbName} 已成功从 ${inputPath} 导入`);
    } catch (error) {
      console.error("导入数据库时发生错误:", error);
    }
  }
}
