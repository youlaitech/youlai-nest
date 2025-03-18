import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, Put } from "@nestjs/common";
import { MenuService } from "./menu.service";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Route, typeMapValue, typeMap } from "./interface/menu.type";

@ApiTags("04.菜单接口")
@Controller("menus")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: "获取菜单树形表格列表" })
  @Get()
  async findAll(@Query("keywords") keywords: string) {
    return await this.menuService.findSearch(keywords);
  }

  @ApiOperation({ summary: "获取菜单路由列表" })
  @Get("routes")
  async findMenu(@Req() request): Promise<Route[]> {
    const id = request["user"]?.userId || "";
    const permIds = await this.menuService.findRouteIDs(id);
    const data = await this.menuService.findRoutes(permIds);
    return data;
  }

  @ApiOperation({ summary: "获取菜单下拉树形列表" })
  @Get("options")
  async GetOptions() {
    return await this.menuService.findOptions();
  }

  @ApiOperation({ summary: "创建菜单" })
  @Post()
  async create(@Req() request, @Body() createMenuDto: CreateMenuDto) {
    return await this.menuService.create({
      ...createMenuDto,
      type: typeMapValue.get(createMenuDto.type),
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "获取菜单表单数据" })
  @Get(":id/form")
  async findOne(@Param("id") id: string): Promise<any> {
    const form = await this.menuService.findOne(id);
    const data = { ...form, id: form._id, type: typeMap.get(form.type) };
    delete data._id;
    return data;
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
  remove(@Param("id") _id: string) {
    return this.menuService.remove(_id);
  }
}
