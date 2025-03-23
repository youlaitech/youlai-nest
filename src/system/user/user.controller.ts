import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Query,
  Put,
  Inject,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { User } from "./user.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import { DEFAULT_PASSWORD } from "src/common/constants";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@ApiTags("02.用户接口")
@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger
  ) {}

  @ApiOperation({ summary: "用户分页列表" })
  @Get("page")
  async getUserPage(
    @Req() request,
    @Query("page") page: number,
    @Query("size") size: number,
    @Query("keywords") keywords: string,
    @Query("status") status: number,
    @Query("startTime") startTime: string,
    @Query("deptId") deptId: string,
    @Query("endTime") endTime: string
  ) {
    const deptTreePath = request["user"]?.deptTreePath || "0";

    this.logger.info("用户分页列表");
    return await this.userService.getUserPage(
      page,
      size,
      deptId,
      keywords,
      status,
      startTime,
      endTime,
      deptTreePath
    );
  }

  @ApiOperation({ summary: "获取当前用户信息" })
  @Get("me")
  async getMe(@Req() request): Promise<User> {
    const id = request["user"]?.userId || "";
    return await this.userService.findMe(id);
  }

  @ApiOperation({ summary: "新增用户" })
  @Post()
  async create(@Req() request, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create({
      ...createUserDto,
      createBy: request["user"]?.sub,
      deptTreePath: request["user"]?.deptTreePath || "0",
      password: DEFAULT_PASSWORD,
    });
  }

  @ApiOperation({ summary: "获取用户表单数据" })
  @Get(":id/form")
  getUserForm(@Param("id") id: string) {
    return this.userService.getUserForm(id);
  }

  @ApiOperation({ summary: "修改用户" })
  @Put(":id")
  updateMenu(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto): any {
    return this.userService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: "删除用户" })
  @Delete(":ids")
  async deleteUser(@Param("ids") ids: string) {
    const idArray = ids.split(",");
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
}
