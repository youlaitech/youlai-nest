import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysUser } from "src/system/user/entities/sys-user.entity";

/**
 * AI 用户工具服务
 */
@Injectable()
export class UserToolsService {
  constructor(@InjectRepository(SysUser) private readonly userRepository: Repository<SysUser>) {}

  // AI 工具：根据用户名更新昵称
  async updateUserNickname(username: string, nickname: string) {
    const usernameSafe = (username || "").trim();
    const nicknameSafe = (nickname || "").trim();

    if (!usernameSafe || !nicknameSafe) {
      throw new Error("username and nickname are required");
    }

    const user = await this.userRepository.findOne({
      where: { username: usernameSafe, isDeleted: 0 },
      select: ["id", "username", "nickname"],
    });
    if (!user) {
      throw new Error(`User not found: ${usernameSafe}`);
    }

    const result = await this.userRepository.update({ username: usernameSafe, isDeleted: 0 }, {
      nickname: nicknameSafe,
      updateTime: new Date(),
    } as any);
    if (!result.affected) {
      throw new Error(`Failed to update nickname for ${usernameSafe}`);
    }

    return {
      username: usernameSafe,
      nickname: nicknameSafe,
      message: "用户昵称更新成功",
    };
  }
}
