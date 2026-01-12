import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  SetMetadata,
  Req,
  Res,
  Patch,
  UploadedFile,
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import type { Response } from "express";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BusinessException } from "../../common/exceptions/business.exception";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { PasswordChangeDto } from "./dto/password-change.dto";
import { MobileUpdateDto } from "./dto/mobile-update.dto";
import { EmailUpdateDto } from "./dto/email-update.dto";
import * as XLSX from "xlsx";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger as WinstonLogger } from "winston";

@ApiTags("02.用户接口")
@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  /**
   * 获取用户分页列表
   *
   * @SetMetadata("resource", "sys_user") - 设置资源权限标识，用于权限控制
   * 该装饰器标识此接口访问的是用户资源，需要相应的权限才能访问
   */
  @ApiOperation({ summary: "用户分页列表" })
  @Get()
  @SetMetadata("resource", "sys_user")
  async getUserList(@Query() queryParams: UserQueryDto) {
    this.logger.info("获取用户分页列表", {
      context: "UserController",
      metadata: {
        pageNum: queryParams.pageNum,
        pageSize: queryParams.pageSize,
        keywords: queryParams.keywords,
      },
    });

    return await this.userService.getUserPage(
      queryParams.pageNum,
      queryParams.pageSize,
      queryParams.deptId,
      queryParams.keywords,
      queryParams.status,
      queryParams.startTime,
      queryParams.endTime
    );
  }

  @ApiOperation({ summary: "获取当前登录用户信息" })
  @Get("me")
  async getCurrentUser(@Req() req) {
    return await this.userService.findMe(req.user);
  }

  @ApiOperation({ summary: "获取个人中心用户信息" })
  @Get("profile")
  async getUserProfile(@Req() req) {
    return await this.userService.findMe(req.user);
  }

  @ApiOperation({ summary: "个人中心修改用户信息" })
  @Put("profile")
  async updateUserProfile(@Req() req, @Body() profileDto: import("./dto/user-profile.dto").UserProfileDto) {
    const success = await this.userService.updateProfile(req.user, profileDto);
    return { success };
  }

  @ApiOperation({ summary: "新增用户" })
  @Post()
  async create(@CurrentUser("userId") currentUserId: number, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create({
      ...createUserDto,
      createBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "获取用户表单数据" })
  @Get(":userId(\\d+)/form")
  async getUserForm(@Param("userId") userId: number) {
    return await this.userService.getUserFormData(userId);
  }

  @ApiOperation({ summary: "修改用户" })
  @Put(":id(\\d+)")
  async update(
    @CurrentUser("userId") currentUserId: number,
    @Param("id") id: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return await this.userService.update(id, {
      ...updateUserDto,
      updateBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "删除用户" })
  @Delete(":ids")
  async deleteUsers(@Param("ids") ids: string) {
    const idArray = ids.split(",").map((id) => Number(id));
    const results = await Promise.all(
      idArray.map(async (id) => {
        const success = await this.userService.deleteUser(id);
        if (!success) {
          throw new BusinessException(`删除用户失败: ${id}`);
        }
        return success;
      })
    );

    return {
      success: true,
      message: `成功删除 ${results.filter(Boolean).length} 个用户`,
    };
  }

  @ApiOperation({ summary: "修改用户状态" })
  @Patch(":userId(\\d+)/status")
  async updateUserStatus(@Param("userId") userId: number, @Query("status") status: number) {
    const success = await this.userService.updateUserStatus(userId, status);
    return { success };
  }

  @ApiOperation({ summary: "用户导入模板下载" })
  @Get("template")
  @SetMetadata("skipResponseTransform", true)
  async downloadTemplate(@Res() res: Response) {
    const headers = ["用户名", "昵称", "性别", "手机号码", "邮箱", "角色", "部门"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "用户导入模板");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = "用户导入模板.xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(fileName)}`);
    res.send(buffer);
  }

  @ApiOperation({ summary: "导入用户" })
  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BusinessException("导入文件不能为空");
    }
    return await this.userService.importUsersFromBuffer(file.buffer);
  }

  @ApiOperation({ summary: "导出用户" })
  @Get("export")
  @SetMetadata("skipResponseTransform", true)
  async exportUsers(@Res() res: Response, @Query() queryParams: UserQueryDto) {
    const exportList = await this.userService.listExportUsers(
      queryParams.deptId,
      queryParams.keywords,
      queryParams.status,
      queryParams.startTime,
      queryParams.endTime
    );

    const headers = ["用户名", "用户昵称", "部门", "性别", "手机号码", "邮箱", "创建时间"];
    const rows = exportList.map((u) => [
      u.username ?? "",
      u.nickname ?? "",
      u.deptName ?? "",
      u.gender ?? "",
      u.mobile ?? "",
      u.email ?? "",
      u.createTime ?? "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "用户列表");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const fileName = "用户列表.xlsx";
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  }

  @ApiOperation({ summary: "重置指定用户密码" })
  @Put(":userId(\\d+)/password/reset")
  async resetUserPassword(@Param("userId") userId: number, @Query("password") password: string) {
    const success = await this.userService.resetUserPassword(userId, password);
    return { success };
  }

  @ApiOperation({ summary: "当前用户修改密码" })
  @Put("password")
  async changeCurrentUserPassword(
    @CurrentUser("userId") currentUserId: number,
    @Body() data: PasswordChangeDto
  ) {
    const success = await this.userService.changeCurrentUserPassword(currentUserId, data);
    return { success };
  }

  @ApiOperation({ summary: "发送短信验证码（绑定或更换手机号）" })
  @Post("mobile/code")
  async sendMobileCode(@Query("mobile") mobile: string) {
    const success = await this.userService.sendMobileCode(mobile);
    return { success };
  }

  @ApiOperation({ summary: "绑定或更换手机号" })
  @Put("mobile")
  async bindOrChangeMobile(@CurrentUser("userId") currentUserId: number, @Body() data: MobileUpdateDto) {
    const success = await this.userService.bindOrChangeMobile(currentUserId, data);
    return { success };
  }

  @ApiOperation({ summary: "发送邮箱验证码（绑定或更换邮箱）" })
  @Post("email/code")
  async sendEmailCode(@Query("email") email: string) {
    await this.userService.sendEmailCode(email);
    return { success: true };
  }

  @ApiOperation({ summary: "绑定或更换邮箱" })
  @Put("email")
  async bindOrChangeEmail(@CurrentUser("userId") currentUserId: number, @Body() data: EmailUpdateDto) {
    const success = await this.userService.bindOrChangeEmail(currentUserId, data);
    return { success };
  }

  @ApiOperation({ summary: "获取用户下拉选项" })
  @Get("options")
  async listUserOptions() {
    return await this.userService.listUserOptions();
  }
}
