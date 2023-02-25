import {
  ProjectGraph,
  readCachedProjectGraph,
  createProjectGraphAsync,
  ExecutorContext,
  logger,
  DependencyType,
  TargetConfiguration,
} from 'nx/src/devkit-exports';
import { SonarExecutorSchema } from './schema';
import sonarScanner from 'sonarqube-scanner';

export interface WorkspaceDependency {
  name: string;
  type: DependencyType | string;
  root: string;
  sourceRoot: string;
  testTarget?: TargetConfiguration;
}

export interface AppInfo {
  appDeps: WorkspaceDependency[];
  sources: string[];
}

export default async function runExecutor(options: SonarExecutorSchema, context: ExecutorContext) {
  logger.log('Executor ran for Build', options);
  let success = true;
  try {
    await scan(options, context);
  } catch (e) {
    logger.error(`The Sonar scan failed for project '${context.projectName}'. Error: ${e}`);
    success = false;
  }
  return {
    success,
  };
}

async function scan(options: SonarExecutorSchema, context: ExecutorContext) {
  logger.log(`Scanning project '${context.projectName}' with opts:`, options);

  let scannerOptions = options.config;
  if (options.autoSourcesDetection) {
    logger.log(`Auto detecting app dependencies`);
    const appInfo = await getExecutedAppInfo(options, context);
    logger.debug('App info:', appInfo);
    scannerOptions = mergeScannerOptsWithAppInfo(scannerOptions, appInfo);
  }

  logger.log('Scanner config', options.hostUrl, scannerOptions);

  await sonarScanner.async({
    serverUrl: options.hostUrl,
    options: scannerOptions,
  });
}

async function getExecutedAppInfo(
  options: SonarExecutorSchema,
  context: ExecutorContext
): Promise<AppInfo> {
  const appDeps = await getExecutedAppDependencies(context, {
    skipImplicitDeps: options.skipImplicitDeps,
  });
  const sources = appDeps.map(d => d.sourceRoot);
  return {
    appDeps,
    sources,
  };
}

async function getExecutedAppDependencies(
  context: ExecutorContext,
  options: { skipImplicitDeps: boolean }
) {
  const appDependencies = (await getDependenciesByAppName(context.projectName)).filter(
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

async function getDependenciesByAppName(appName: string) {
  let projectGraph: ProjectGraph;
  try {
    projectGraph = readCachedProjectGraph();
  } catch (e) {
    projectGraph = await createProjectGraphAsync();
  }

  const target = collectDependencies(projectGraph, appName);

  return Array.from(target.values());
}

function collectDependencies(
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

    const deps = collectDependencies(projectGraph, d.target);

    deps.forEach((libs, target) => {
      workspaceModuleDependencies.set(target, libs);
    });
  });

  return workspaceModuleDependencies;
}

function mergeScannerOptsWithAppInfo(scannerOptions: Record<string, string>, appInfo: AppInfo) {
  const newScannerOpts = { ...scannerOptions };
  newScannerOpts['sonar.sources'] = `${appInfo.sources}${
    newScannerOpts['sonar.sources'] ? `,${newScannerOpts['sonar.sources']}` : ''
  }`;
  newScannerOpts['sonar.tests'] = `${appInfo.sources}${
    newScannerOpts['sonar.tests'] ? `,${newScannerOpts['sonar.tests']}` : ''
  }`;

  return transformScannerOptions(newScannerOpts, appInfo);
}

function transformScannerOptions(scannerOptions: Record<string, string>, appInfo: AppInfo) {
  const newScannerOpts = { ...scannerOptions };
  Object.entries(newScannerOpts).forEach(([optionKey, optionRawValue]) => {
    const optionValues = optionRawValue.split(',');
    const transformedScannerOption = optionValues
      .map(optionValue => {
        const match = optionValue.match(/^\[(.*)\]$/);
        if (match && match[1]) {
          const matchedFilePath = match[1] ?? '';
          const values = appInfo.appDeps.map(d => matchedFilePath.replace('{projectRoot}', d.root));
          return values.join(',');
        }
        return optionValue;
      })
      .join(',');
    newScannerOpts[optionKey] = transformedScannerOption;
  });
  return newScannerOpts;
}
