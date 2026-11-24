import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsDefined, Validate } from "class-validator";
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

@ValidatorConstraint({ name: "visitTrendRange", async: false })
export class VisitTrendRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const dto = args.object as VisitTrendQueryDto;
    if (!dto.startDate || !dto.endDate) {
      return true;
    }
    const start = new Date(dto.startDate).getTime();
    const end = new Date(dto.endDate).getTime();
    const days = (end - start) / (24 * 60 * 60 * 1000);
    return days >= 0 && days < 366;
  }

  defaultMessage() {
    return "结束日期不能早于开始日期，且跨度不能超过 366 天";
  }
}

/**
 * 访问趋势查询对象
 */
export class VisitTrendQueryDto {
  @IsDateString()
  @IsDefined()
  @ApiProperty({ description: "开始日期 yyyy-MM-dd" })
  startDate: string;

  @IsDateString()
  @IsDefined()
  @Validate(VisitTrendRangeConstraint)
  @ApiProperty({ description: "结束日期 yyyy-MM-dd" })
  endDate: string;
}
