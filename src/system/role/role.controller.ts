import { Controller, Get, Post, Body, Param, Delete, Req, Query, Put } from "@nestjs/common";
import { RoleService } from "./role.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RoleQueryDto } from "./dto/role-query.dto";

/**
 * 角色接口控制器
 */
@ApiTags("03.角色接口")
@Controller("roles")
export class RoleController {
  constructor(private readonly rolesService: RoleService) {}

  @ApiOperation({ summary: "角色下拉列表" })
  @Get("options")
  async getRoleOptions() {
    return await this.rolesService.getRoleOptions();
  }

  @ApiOperation({ summary: "角色分页列表" })
  @Get()
  async getRolePage(@Query() query: RoleQueryDto) {
    return await this.rolesService.getRolePage(query.pageNum, query.pageSize, query.keywords);
  }

  @ApiOperation({ summary: "新增角色" })
  @Post()
  async create(@Req() request, @Body() createRoleDto: CreateRoleDto) {
    await this.rolesService.saveRole({ ...createRoleDto });
    return { success: true };
  }

  @ApiOperation({ summary: "角色表单数据" })
  @Get(":id/form")
  async getRoleForm(@Param("id") id: string) {
    return await this.rolesService.getRoleForm(id);
  }

  @ApiOperation({ summary: "修改角色" })
  @Put(":id")
  async updateRole(@Param("id") id: string, @Body() updateRoleDto: UpdateRoleDto) {
    await this.rolesService.saveRole({ ...updateRoleDto, id });
    return { success: true };
  }

  @ApiOperation({ summary: "修改角色状态" })
  @Put(":roleId/status")
  async updateRoleStatus(@Param("roleId") roleId: string, @Query("status") status: number) {
    const success = await this.rolesService.updateRoleStatus(roleId, status);
    return { success };
  }

  @ApiOperation({ summary: "删除角色" })
  @Delete(":ids")
  async deleteRoles(@Param("ids") ids: string) {
    await this.rolesService.deleteRoles(ids);
    return { success: true };
  }

  @ApiOperation({ summary: "获取角色权限" })
  @Get(":id/menuIds")
  async findMenuIds(@Param("id") roleId: string) {
    return await this.rolesService.getRoleMenuIds(roleId);
  }

  @ApiOperation({ summary: "角色分配权限" })
  @Put(":id/menus")
  async updateMenus(@Param("id") id: string, @Body() menuIds: (string | number)[]): Promise<any> {
    const ids = (menuIds || []).map((v) => v.toString());
    return await this.rolesService.updateMenus(id, ids);
  }
}
