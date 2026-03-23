import { IsOptional, IsEnum, IsDateString, IsInt, Min } from "class-validator";

export enum ActionTypeEnum {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  CHANGE_PWD = "CHANGE_PWD",
  UPDATE_PROFILE = "UPDATE_PROFILE",
  API = "API",
}
