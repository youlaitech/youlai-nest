import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, Put } from "@nestjs/common";
import { MenuService } from "./menu.service";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Route } from "./interface/menu.type";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

/**
 * 菜单接口控制器
 */
@ApiTags("04.菜单接口")
@Controller("menus")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: "获取菜单树形表格列表" })
  @Get()
  async getMenus(@Query("keywords") keywords: string) {
    return await this.menuService.getMenus(keywords);
  }

  @ApiOperation({ summary: "获取菜单路由列表" })
  @Get("routes")
  async getRoutes(@Req() request): Promise<Route[]> {
    const userId = request["user"]?.userId || "";
    const routes = await this.menuService.getRoutes(userId);
    return routes;
  }

  @ApiOperation({ summary: "获取菜单下拉树形列表" })
  @Get("options")
  async GetOptions() {
    return await this.menuService.findOptions();
  }

  @ApiOperation({ summary: "创建菜单" })
  @Post()
  async create(@CurrentUser("userId") currentUserId: string, @Body() createMenuDto: CreateMenuDto) {
    return await this.menuService.create({
      ...createMenuDto,
    });
  }

  @ApiOperation({ summary: "获取菜单表单数据" })
  @Get(":id/form")
  async getMenuForm(@Param("id") id: string): Promise<any> {
    return await this.menuService.getMenuForm(id);
  }

  @ApiOperation({ summary: "修改菜单" })
  @Put(":id")
  updateMenu(@Param("id") id: string, @Body() updateMenuDto: UpdateMenuDto): any {
    return this.menuService.update(id, updateMenuDto);
  }

  @ApiOperation({ summary: "修改菜单显示状态" })
  @Patch(":id")
  async update(@Param("id") id: string, @Query("visible") visible: number) {
    return await this.menuService.update(id, {
      visible: visible,
    });
  }

  @ApiOperation({ summary: "删除菜单" })
  @Delete(":id")
  deleteMenu(@Param("id") id: string) {
    return this.menuService.deleteMenu(id);
  }
}
