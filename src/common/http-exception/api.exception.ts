import { HttpException, HttpStatus } from "@nestjs/common";
import { BusinessErrorCode } from "../enums/business-error-code.enum";

export class ApiException extends HttpException {
  private errorMessage: string;
  private errorCode: BusinessErrorCode;

  constructor(
    errorMessage: string,
    errorCode: BusinessErrorCode,
    statusCode: HttpStatus = HttpStatus.OK
  ) {
    super(errorMessage, statusCode);
    this.errorMessage = errorMessage;
    this.errorCode = errorCode;
  }

  getErrorCode(): BusinessErrorCode {
    return this.errorCode;
  }

  getErrorMessage(): string {
    return this.errorMessage;
  }
}
