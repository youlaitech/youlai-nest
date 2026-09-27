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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/auth.decorator";
import { Log } from "../../common/decorators/log.decorator";
import { ActionTypeValue } from "../../common/enums/action-type.enum";
import { LogModuleValue } from "../../common/enums/log-module.enum";
import { MenuService } from "./menu.service";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { MenuAiFillDto } from "./dto/menu-ai-fill.dto";
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
  async getMenuOptions(@Query("types") types?: string) {
    // 前端可传 types=C,M 或重复键 types=C&types=M，均按逗号拆分解析
    const typeList = types
      ? types
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item)
      : undefined;
    return await this.menuService.findOptions(typeList);
  }

  @ApiOperation({ summary: "获取菜单列表" })
  @Get()
  @SetMetadata("resource", "sys_menu")
  async getMenus(@Query("keywords") keywords: string) {
    return await this.menuService.getMenus(keywords);
  }

  @ApiOperation({ summary: "AI 推断菜单的访问路径与权限标识" })
  @Post("ai-fill")
  async aiFillMenu(@Body() menuAiFillDto: MenuAiFillDto) {
    return await this.menuService.aiFill(menuAiFillDto);
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
  @Log(LogModuleValue.MENU, ActionTypeValue.UPDATE)
  @Patch(":id")
  @Permissions("sys:menu:update")
  async update(@Param("id") id: string, @Query("visible") visible: number) {
    return await this.menuService.update(id, {
      visible: visible,
    } as any);
  }

  @ApiOperation({ summary: "删除菜单" })
  @Log(LogModuleValue.MENU, ActionTypeValue.DELETE)
  @Delete(":id")
  @Permissions("sys:menu:delete")
  deleteMenu(@Param("id") id: string) {
    return this.menuService.deleteMenu(id);
  }
}
