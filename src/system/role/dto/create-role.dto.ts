import { IsString, IsNumber, IsOptional, IsArray, IsMongoId } from "class-validator";
import { BaseDto } from "../../../common/dto/base.dto";

export class CreateRoleDto extends BaseDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly code: string;

  @IsOptional()
  @IsNumber()
  readonly sort?: number | null;

  @IsNumber()
  readonly status: number;

  @IsOptional()
  @IsNumber()
  readonly dataScope?: number | null;

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  readonly menus?: string[];
}
