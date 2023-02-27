import {
  ProjectGraph,
  readCachedProjectGraph,
  createProjectGraphAsync,
  ExecutorContext,
  logger,
  DependencyType,
  TargetConfiguration,
} from 'nx/src/devkit-exports';
import { ScanExecutorSchema } from './schema';
import * as sonarScanner from 'sonarqube-scanner';

export interface WorkspaceDependency {
  name: string;
  type: DependencyType | string;
  root: string;
  sourceRoot: string;
  testTarget?: TargetConfiguration;
}

export interface AppInfo {
  workspaceDependencies: WorkspaceDependency[];
  workspaceSources: string[];
}

export default async function runExecutor(options: ScanExecutorSchema, context: ExecutorContext) {
  logger.log('Executor ran for Sonar', options);
  let success = true;
  try {
    await scan(options, context);
  } catch (e) {
    logger.error(`The Sonar scan failed for project '${context.projectName}'. Error: ${e}`);
    success = false;
  }
  return { success };
}

async function scan(options: ScanExecutorSchema, context: ExecutorContext) {
  logger.log(`Scanning project '${context.projectName}' with Sonar`);
  logger.debug(`Scanning project '${context.projectName}' with Sonar and opts:`, options)

  let scannerOptions = options.config;
  if (options.autoSourcesDetection) {
    logger.log(`Analyzing app dependencies to detect dependencies...`);
    const appInfo = await getExecutedAppInfo(context, { skipImplicitDeps: options.skipImplicitDeps });
    logger.debug('App info:', appInfo);
    scannerOptions = mergeScannerOptsWithAppInfo(scannerOptions, appInfo);
  }

  logger.debug('Sonar scanner config', options.hostUrl, scannerOptions);

  await sonarScanner.async({
    serverUrl: options.hostUrl,
    options: scannerOptions,
  });
}

async function getExecutedAppInfo(
  context: ExecutorContext,
  options: { skipImplicitDeps: boolean }
): Promise<AppInfo> {
  const workspaceDependencies = await getExecutedAppWorkspaceDependencies(context, options);
  const workspaceSources = workspaceDependencies.map(d => d.sourceRoot);
  return { workspaceDependencies, workspaceSources };
}

async function getExecutedAppWorkspaceDependencies(
  context: ExecutorContext,
  options: { skipImplicitDeps: boolean }
) {
  const appDependencies = (await getWorkspaceDependenciesByAppName(context.projectName)).filter(
    d => !(options.skipImplicitDeps && d.type === DependencyType.implicit)
  );
  const projectConfiguration = context.workspace.projects[context.projectName];
  return [
    {
      name: context.projectName,
      type: DependencyType.static,
      root: projectConfiguration.root,
      sourceRoot: projectConfiguration.sourceRoot,
      testTarget: projectConfiguration.targets.test,
    },
    ...appDependencies,
  ];
}

async function getWorkspaceDependenciesByAppName(appName: string) {
  let projectGraph: ProjectGraph;
  try {
    projectGraph = readCachedProjectGraph();
  } catch (e) {
    projectGraph = await createProjectGraphAsync();
  }

  const target = collectWorkspaceDependenciesByModule(projectGraph, appName);

  return Array.from(target.values());
}

function collectWorkspaceDependenciesByModule(
  projectGraph: ProjectGraph,
  moduleName: string
): Map<string, WorkspaceDependency> {
  const workspaceModuleDependencies = new Map<string, WorkspaceDependency>();
  const directModuleDependencies = projectGraph.dependencies[moduleName] ?? [];
  if (!directModuleDependencies.length) {
    return workspaceModuleDependencies;
  }

  const workspaceDirectModuleDependencies = directModuleDependencies.filter(
    d => !d.target.startsWith('npm:')
  );
  workspaceDirectModuleDependencies.forEach(d => {
    workspaceModuleDependencies.set(d.target, {
      name: d.target,
      type: d.type,
      root: projectGraph.nodes[d.target].data.root,
      sourceRoot: projectGraph.nodes[d.target].data.sourceRoot,
      testTarget: projectGraph.nodes[d.target].data.targets.test,
    });

    const deps = collectWorkspaceDependenciesByModule(projectGraph, d.target);

    deps.forEach((libs, target) => {
      workspaceModuleDependencies.set(target, libs);
    });
  });

  return workspaceModuleDependencies;
}

function mergeScannerOptsWithAppInfo(scannerOptions: Record<string, string>, appInfo: AppInfo) {
  const newScannerOpts = { ...scannerOptions };
  newScannerOpts['sonar.sources'] = `${appInfo.workspaceSources}${
    newScannerOpts['sonar.sources'] ? `,${newScannerOpts['sonar.sources']}` : ''
  }`;
  newScannerOpts['sonar.tests'] = `${appInfo.workspaceSources}${
    newScannerOpts['sonar.tests'] ? `,${newScannerOpts['sonar.tests']}` : ''
  }`;

  return expandScannerOptions(newScannerOpts, appInfo);
}

function expandScannerOptions(scannerOptions: Record<string, string>, appInfo: AppInfo) {
  return Object.entries(scannerOptions).reduce((newScannerOpts, [optionKey, optionRawValue]) => {
    const optionRawValues = optionRawValue.split(',');
    newScannerOpts[optionKey] = optionRawValues
      .map(optionValue => {
        // Expand each scanner option value
        const match = optionValue.match(/^\[(.*)\]$/);
        if (match && match[1]) {
          const matchedFilePath = match[1] ?? '';
          // Replace vars
          const values = appInfo.workspaceDependencies
            .map(d => matchedFilePath.replace('{projectRoot}', d.root));
          return values.join(',');
        }
        return optionValue;
      })
      .join(',')
    return newScannerOpts;
  }, {});
}
