import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  SetMetadata,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Permissions } from "src/common/decorators/public.decorator";
import { MenuService } from "./menu.service";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";

@ApiTags("04.菜单接口")
@Controller("menus")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: "获取路由列表" })
  @Get("routes")
  async getRoutes(@CurrentUser("userId") userId: string) {
    return await this.menuService.getRoutes(userId);
  }

  @ApiOperation({ summary: "菜单下拉树形列表" })
  @Get("options")
  async getMenuOptions() {
    return await this.menuService.findOptions();
  }

  @ApiOperation({ summary: "获取菜单列表" })
  @Get()
  @SetMetadata("resource", "sys_menu")
  async getMenus(@Query("keywords") keywords: string) {
    return await this.menuService.getMenus(keywords);
  }

  @ApiOperation({ summary: "新增菜单" })
  @Post()
  @Permissions("sys:menu:create")
  async create(@CurrentUser("userId") currentUserId: string, @Body() createMenuDto: CreateMenuDto) {
    return await this.menuService.create({
      ...createMenuDto,
    });
  }

  @ApiOperation({ summary: "获取菜单表单数据" })
  @Get(":id/form")
  @Permissions("sys:menu:update")
  async getMenuForm(@Param("id") id: string): Promise<any> {
    return await this.menuService.getMenuForm(id);
  }

  @ApiOperation({ summary: "修改菜单" })
  @Put(":id")
  @Permissions("sys:menu:update")
  updateMenu(@Param("id") id: string, @Body() updateMenuDto: UpdateMenuDto): any {
    return this.menuService.update(id, updateMenuDto);
  }

  @ApiOperation({ summary: "修改菜单显示状态" })
  @Patch(":id")
  @Permissions("sys:menu:update")
  async update(@Param("id") id: string, @Query("visible") visible: number) {
    return await this.menuService.update(id, {
      visible: visible,
    } as any);
  }

  @ApiOperation({ summary: "删除菜单" })
  @Delete(":id")
  @Permissions("sys:menu:delete")
  deleteMenu(@Param("id") id: string) {
    return this.menuService.deleteMenu(id);
  }
}
