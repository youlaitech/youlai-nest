import { IsString, IsNumber, IsOptional, IsArray, IsMongoId } from "class-validator";

export class CreateRoleDto {
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
