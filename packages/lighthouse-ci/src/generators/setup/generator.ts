import {
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { SetupLighthouseCIGeneratorSchema } from './schema';

interface NormalizedSchema extends SetupLighthouseCIGeneratorSchema {
  projectName: string;
  projectRoot: string;
}

function normalizeOptions(
  tree: Tree,
  options: SetupLighthouseCIGeneratorSchema
): NormalizedSchema {
  const projectName = names(options.appName).fileName;
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectName}`;
  return {
    ...options,
    projectName,
    projectRoot,
  };
}

export default async function (
  tree: Tree,
  options: SetupLighthouseCIGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  updateGitIgnore(tree);
  addLighthouseConfig(tree, normalizedOptions);
  updateProjectConfig(tree, normalizedOptions);
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree): void {
  const ignoreFile = '.gitignore';
  if (tree.exists(ignoreFile)) {
    let gitIgnore = tree.read('.gitignore').toString('utf-8');
    if (
      !gitIgnore.includes('# Lighthouse CI (nx-lighthouse-ci setup generator)')
    ) {
      gitIgnore +=
        '\n# Lighthouse CI (nx-lighthouse-ci setup generator)\n.lighthouseci';
      tree.write(ignoreFile, gitIgnore);
    }
  }
}

function addLighthouseConfig(tree: Tree, options: NormalizedSchema): void {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src'),
    options.projectRoot,
    {
      serverCommand: options.serverCommand ?? 'YOUR_APP_SERVER_COMMAND',
    }
  );
}

function updateProjectConfig(
  tree: Tree,
  options: SetupLighthouseCIGeneratorSchema
): void {
  const projectConfiguration = readProjectConfiguration(tree, options.appName);
  if (projectConfiguration.targets['lighthouse-ci-check']) {
    throw new Error(
      `Project "${options.appName}" already has a "lighthouce-ci-check" target configured`
    );
  } else {
    projectConfiguration.targets['lighthouse-ci-check'] = {
      executor: 'nx:run-commands',
      options: {
        command: `npx @lhci/cli autorun --config apps/${options.appName}/.lighthouserc.json`,
      },
    };
    updateProjectConfiguration(tree, options.appName, projectConfiguration);
  }
}
