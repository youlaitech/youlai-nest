export interface GenConfigFormDto {
  id?: string;
  tableName?: string;
  businessName?: string;
  moduleName?: string;
  packageName?: string;
  entityName?: string;
  author?: string;
  parentMenuId?: string;
  backendAppName?: string;
  frontendAppName?: string;
  fieldConfigs?: FieldConfigDto[];
  pageType?: "classic" | "curd";
  removeTablePrefix?: string;
}

export interface FieldConfigDto {
  id?: string;
  columnName?: string;
  columnType?: string;
  fieldName?: string;
  fieldType?: string;
  fieldComment?: string;
  isShowInList?: number;
  isShowInForm?: number;
  isShowInQuery?: number;
  isRequired?: number;
  formType?: number;
  queryType?: number;
  maxLength?: number;
  fieldSort?: number;
  dictType?: string;
}
