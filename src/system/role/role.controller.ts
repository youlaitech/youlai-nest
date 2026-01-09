import { Controller, Get, Post, Body, Param, Delete, Req, Query, Put } from "@nestjs/common";
import { RoleService } from "./role.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RoleQueryDto } from "./dto/role-query.dto";

@ApiTags("03.角色接口")
@Controller("roles")
export class RoleController {
  constructor(private readonly rolesService: RoleService) {}

  @ApiOperation({ summary: "角色分页列表" })
  @Get()
  async getRolePage(@Query() query: RoleQueryDto) {
    return await this.rolesService.getRolePage(query.pageNum, query.pageSize, query.keywords);
  }

  @ApiOperation({ summary: "角色下拉列表" })
  @Get("options")
  async getRoleOptions() {
    return await this.rolesService.getRoleOptions();
  }

  @ApiOperation({ summary: "新增角色" })
  @Post()
  create(@Req() request, @Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create({
      ...createRoleDto,
    });
  }

  @ApiOperation({ summary: "角色表单数据" })
  @Get(":id/form")
  async getRoleForm(@Param("id") id: number) {
    return await this.rolesService.getRoleForm(id);
  }

  @ApiOperation({ summary: "修改角色" })
  @Put(":id")
  async updateRole(@Param("id") id: number, @Body() updateRoleDto: UpdateRoleDto) {}

  @ApiOperation({ summary: "删除角色" })
  @Delete(":ids")
  async deleteDepartments(@Param("ids") ids: string) {
    const idArray = ids.split(",").map((id) => Number(id));
    for (const id of idArray) {
      await this.rolesService.remove(id);
    }
  }

  @ApiOperation({ summary: "获取角色权限" })
  @Get(":id/menuIds")
  async findMenuIds(@Param("id") roleId: number) {
    const roleMenus = await this.rolesService.getMenuIdsByRoleIds([roleId]);
    return roleMenus;
  }

  @ApiOperation({ summary: "角色分配权限" })
  @Put(":id/menus")
  async updateMenus(@Param("id") id: number, @Body() menuIds: number[]): Promise<any> {
    return await this.rolesService.updateMenus(id, menuIds);
  }
}
