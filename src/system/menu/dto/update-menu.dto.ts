import { PartialType } from "@nestjs/swagger";
import { CreateMenuDto } from "./create-menu.dto";

/**
 * 菜单更新参数
 */
export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
