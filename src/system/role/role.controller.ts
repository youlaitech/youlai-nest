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
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { RoleService } from "./role.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("角色模块")
@Controller("roles")
export class RoleController {
  // 注入 RolesService
  constructor(private readonly rolesService: RoleService) {}

  @ApiOperation({ summary: "角色分页查询" })
  @Get("page")
  async getRolePage(
    @Req() request,
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("keywords") keywords: string
  ) {
    const deptTreePath = request["user"]?.deptTreePath || "0";
    return await this.rolesService.findSearch(pageNum, pageSize, keywords, deptTreePath);
  }

  @ApiOperation({ summary: "获取角色下拉列表" })
  @Get("options")
  async GetOptions() {
    return await this.rolesService.findOptions();
  }

  @ApiOperation({ summary: "新增角色" })
  @Post()
  create(@Req() request, @Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create({
      ...createRoleDto,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "获取角色表单数据" })
  @Get(":id/form")
  async findForm(@Param("id") id: string) {
    return await this.rolesService.findOne(id);
  }

  @ApiOperation({ summary: "修改角色" })
  @Put(":id")
  async updateRole(@Param("id") id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<any> {
    return await this.rolesService.update(id, updateRoleDto);
  }

  @ApiOperation({ summary: "删除角色" })
  @Delete(":ids")
  async deleteDepartments(@Param("ids") ids: string) {
    const idArray = ids.split(",");
    for (const id of idArray) {
      const success = await this.rolesService.remove(id);
      if (!success) {
        throw new HttpException(
          `Failed to delete department with ID: ${id}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
    return "操作成功";
  }

  @ApiOperation({ summary: "获取角色权限" })
  @Get(":id/menuIds")
  async findMenuIds(@Param("id") id: string) {
    const data = await this.rolesService.findOne(id);
    return data.menus;
  }

  @ApiOperation({ summary: "角色权限分配" })
  @Put(":id/menus")
  async updateMenus(@Param("id") id: string, @Body() menuData: any): Promise<any> {
    return await this.rolesService.updateMenus(id, menuData);
  }
}
