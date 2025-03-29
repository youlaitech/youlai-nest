import { Controller, Get, Post, Body, Param, Delete, Req, Query, Put } from "@nestjs/common";
import { RoleService } from "./role.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("03.角色接口")
@Controller("roles")
export class RoleController {
  constructor(private readonly rolesService: RoleService) {}

  @ApiOperation({ summary: "角色分页列表" })
  @Get("page")
  async getRolePage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("keywords") keywords: string
  ) {
    return await this.rolesService.getRolePage(pageNum, pageSize, keywords);
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
  async getRoleForm(@Param("id") id: string) {
    return await this.rolesService.findOne(id);
  }

  @ApiOperation({ summary: "修改角色" })
  @Put(":id")
  async updateRole(@Param("id") id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return await this.rolesService.update(id, updateRoleDto);
  }

  @ApiOperation({ summary: "删除角色" })
  @Delete(":ids")
  async deleteDepartments(@Param("ids") ids: string) {
    const idArray = ids.split(",");
    for (const id of idArray) {
      await this.rolesService.remove(id);
    }
  }

  @ApiOperation({ summary: "获取角色权限" })
  @Get(":id/menuIds")
  async findMenuIds(@Param("id") roleId: string) {
    const data = await this.rolesService.findOne(roleId);
    return data.menuIds;
  }

  @ApiOperation({ summary: "角色分配权限" })
  @Put(":id/menus")
  async updateMenus(@Param("id") id: string, @Body() menuIds: string[]): Promise<any> {
    console.log("menuData", menuIds);
    return await this.rolesService.updateMenus(id, menuIds);
  }
}
