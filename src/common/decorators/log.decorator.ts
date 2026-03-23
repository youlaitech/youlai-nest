import { SetMetadata } from "@nestjs/common";
import type { ActionTypeValue } from "../../system/log/action-type.enum";
import type { LogModuleValue } from "../../system/log/log-module.enum";

export const LOG_MODULE = "log_module";
export const LOG_ACTION_TYPE = "log_action_type";
export const LOG_TITLE = "log_title";

export interface LogMetadata {
  module: LogModuleValue;
  actionType: ActionTypeValue;
  title?: string;
  content?: string;
}

export const Log = (
  module: LogModuleValue,
  actionType: ActionTypeValue,
  title?: string,
  content?: string
) => SetMetadata(LOG_MODULE, { module, actionType, title, content } as LogMetadata);
