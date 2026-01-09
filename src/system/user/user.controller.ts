import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  UseInterceptors,
  SetMetadata,
  Req,
  Res,
  Logger,
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
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";
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
  @Get(":id/form")
  async getUserForm(@Param("id") id: number) {
    return await this.userService.getUserFormData(id);
  }

  @ApiOperation({ summary: "获取用户表单数据" })
  @Get(":id/form/data")
  async getUserFormData(@Param("id") id: string) {
    return await this.userService.getUserFormData(+id);
  }

  @ApiOperation({ summary: "修改用户" })
  @Put(":id")
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

    // Build CSV content
    const headers = ["用户名", "昵称", "性别", "部门", "手机号码", "邮箱", "状态", "创建时间"];
    const rows = exportList.map((u) => [
      u.username ?? "",
      u.nickname ?? "",
      u.gender ?? "",
      u.deptName ?? "",
      u.mobile ?? "",
      u.email ?? "",
      typeof u.status !== "undefined" ? String(u.status) : "",
      u.createTime ?? "",
    ]);

    const csvLines = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))];
    const csvContent = "\uFEFF" + csvLines.join("\r\n");

    const fileName = "用户列表.csv";
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(Buffer.from(csvContent, "utf8"));
  }
}
