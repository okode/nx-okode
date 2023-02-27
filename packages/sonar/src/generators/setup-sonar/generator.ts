import {
  formatFiles,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { SetupSonarGeneratorSchema } from './schema';

export default async function(
  tree: Tree,
  options: SetupSonarGeneratorSchema
) {
  updateGitIgnore(tree);
  updateProjectConfig(tree, options);
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree): void {
  const ignoreFile = '.gitignore';

  if (tree.exists(ignoreFile)) {
    let gitIgnore = tree.read('.gitignore').toString('utf-8');
    if (!gitIgnore.includes('# Sonar (setup-sonar generator)')) {
      gitIgnore += '\n# Sonar (setup-sonar generator)\n.scannerwork\n.sonar/';
      tree.write(ignoreFile, gitIgnore);
    }
  }
}

function updateProjectConfig(tree: Tree,
  options: SetupSonarGeneratorSchema): void {
  const projectConfiguration = readProjectConfiguration(tree, options.appName);
  if (projectConfiguration.targets.sonar) {
    throw new Error(
      `Project "${options.appName}" already has a "sonar" target configured`
    );
  } else {
    projectConfiguration.targets.sonar = {
      executor: '@okode/nx-sonar:scan',
      options: {
        hostUrl: options.sonarHostUrl,
        config: {
          'sonar.projectKey': options.sonarProjectKey ?? '',
          'sonar.projectName': options.sonarProjectName ?? '',
        }
      },
    };
    updateProjectConfiguration(tree, options.appName, projectConfiguration);
  }
}
