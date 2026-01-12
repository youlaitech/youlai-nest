import { IsString, IsNumber, IsOptional } from "class-validator";

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
}
