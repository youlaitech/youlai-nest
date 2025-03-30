import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("12.订单接口")
@Controller("products")
export class OrderController {}
