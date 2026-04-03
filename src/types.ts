export interface Param {
  paramId?: string;
  paramName: string;
  paramType?: string;
  description?: string;
  required?: boolean | number;
  defaultValue?: string;
  example?: string;
}

export interface InParamModelData {
  queryParam: Param[];
  bodyParam: Param[];
  formParam: Param[];
  headerParam: Param[];
  pathParam: Param[];
  binaryMessage?: unknown[];
}

export interface InterfaceInfo {
  interfaceId: string;
  interfaceName: string;
  description: string;
  fullPath: string;
  httpMethodName: string;
  httpProtocolName?: string;
  interfaceStatusName: string;
  interfaceContentType?: string;
  inParamModelData: InParamModelData;
  inParams?: Param[];
  outResults?: unknown[];
  mockReturnResultExample?: unknown[];
  bodyRequestDemo?: string;
  isMock?: number;
}

export interface Module {
  moduleId: string;
  moduleName: string;
  interfaceInfos: InterfaceInfo[];
}

export interface ProjectInfo {
  projectName: string;
  projectPath: string;
  description?: string;
  projectStatusName?: string;
}

export interface ApiResponseData {
  projectInfo: ProjectInfo;
  modules: Module[];
  dict?: Record<string, unknown[]>;
}

export interface ApiResponse {
  code: string;
  msg: string;
  error: unknown;
  data: ApiResponseData;
}

export interface SwaggerSourceConfig {
  webUrl: string;
  name?: string;
}

export interface SourcesConfig {
  sources: SwaggerSourceConfig[];
  cacheMinutes?: number;
}

export interface CachedSource {
  name: string;
  data: ApiResponseData;
  fetchedAt: Date;
  apiUrl: string;
}
