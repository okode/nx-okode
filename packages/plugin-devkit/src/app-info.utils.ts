import {
  ProjectGraph,
  readCachedProjectGraph,
  createProjectGraphAsync,
  ExecutorContext,
  DependencyType,
  TargetConfiguration,
} from 'nx/src/devkit-exports';

export interface WorkspaceDependency {
  name: string;
  type: DependencyType | string;
  root: string;
  sourceRoot: string;
  testTarget?: TargetConfiguration;
}

export interface AppInfo {
  workspaceVersion?: string;
  workspaceDependencies: WorkspaceDependency[];
  workspaceSources: string[];
}

export async function getExecutedAppInfo(
  context: ExecutorContext,
  options: { skipImplicitDeps: boolean }
): Promise<AppInfo> {
  const workspaceDependencies = await getExecutedAppWorkspaceDependencies(context, options);
  const workspaceSources = workspaceDependencies.map(d => d.sourceRoot);
  const workspaceVersion = context.workspace?.version ? String(context.workspace.version) : undefined;
  return { workspaceDependencies, workspaceSources, workspaceVersion };
}

export async function getExecutedAppWorkspaceDependencies(
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

export async function getWorkspaceDependenciesByAppName(appName: string) {
  let projectGraph: ProjectGraph;
  try {
    projectGraph = readCachedProjectGraph();
  } catch (e) {
    projectGraph = await createProjectGraphAsync();
  }

  const target = collectWorkspaceDependenciesByModule(projectGraph, appName);

  return Array.from(target.values());
}

export function collectWorkspaceDependenciesByModule(
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

