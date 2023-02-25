export interface SonarExecutorSchema {
  hostUrl: string;
  config: Record<string, string>;
  autoSourcesDetection?: boolean;
  skipImplicitDeps?: boolean;
}
