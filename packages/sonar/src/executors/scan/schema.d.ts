export interface ScanExecutorSchema {
  hostUrl: string;
  config: Record<string, string>;
  autoSourcesDetection?: boolean;
  skipImplicitDeps?: boolean;
  verbose?: boolean;
}
