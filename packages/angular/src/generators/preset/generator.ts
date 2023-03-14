import {
  addDependenciesToPackageJson,
  generateFiles,
  installPackagesTask,
  joinPathFragments,
  ProjectConfiguration,
  readJson,
  Tree,
  writeJson,
} from '@nrwl/devkit';
import { PresetGeneratorSchema } from './schema';
import {
  convertDependenciesToObject,
  DEPENDENCIES,
} from '../../utils/dependencies.constants';
import applicationGenerator from '../application/generator';
import { formatAllFiles } from '@okode/nx-plugin-devkit';

export default async function (tree: Tree, options: PresetGeneratorSchema) {
  await applicationGenerator(tree, {
    name: options.name,
  });
  updateGitIgnoreForNx(tree);
  addWorkspaceNxConfig(tree);
  addVscodeConfig(tree);
  addCicdConfig(tree);
  addSemver(tree);
  setupEditorConfig(tree);
  setupPrettier(tree);
  setupEslintRules(tree);
  addHusky(tree);
  await formatAllFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}

function updateGitIgnoreForNx(tree: Tree): void {
  const ignoreFile = '.gitignore';
  if (tree.exists(ignoreFile)) {
    let gitIgnore = tree.read('.gitignore').toString('utf-8');
    gitIgnore += '\n# Env files (nx-angular setup generator)\n.env*';
    tree.write(ignoreFile, gitIgnore);
  }
}

function addWorkspaceNxConfig(tree: Tree) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/nx-workspace-config'),
    '.',
    {
      template: '',
    }
  );
}

function addVscodeConfig(tree: Tree) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/vscode-config'),
    '.',
    {
      template: '',
    }
  );
}

function addCicdConfig(tree: Tree) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/circleci-config'),
    '.',
    {}
  );
  const projectConfiguration = readJson<ProjectConfiguration>(
    tree,
    'project.json'
  );
  if (!projectConfiguration.targets['ci-test']) {
    projectConfiguration.targets['ci-test'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'nx affected --base=$NX_BASE --head=$NX_HEAD --target=test --configuration ci --coverageReporters lcov',
      },
    };
    projectConfiguration.targets['ci-lint'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'nx affected --base=$NX_BASE --head=$NX_HEAD --target=lint --outputFile {workspaceRoot}/lint-results/{projectRoot}/lint-results.json --format json',
      },
    };
    projectConfiguration.targets['ci-lighthouse-check'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'nx affected --base=$NX_BASE --head=$NX_HEAD --target=lighthouse-check',
      },
    };
    projectConfiguration.targets['ci-e2e'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'nx affected --base=$NX_BASE --head=$NX_HEAD --target=e2e --configuration ci',
      },
    };
    projectConfiguration.targets['ci-percy-e2e'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'nx affected --base=$NX_BASE --head=$NX_HEAD --target=percy-e2e --configuration ci',
      },
    };
    projectConfiguration.targets['ci-sonar'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'npx nx affected --base=$NX_BASE --head=$NX_HEAD --target=sonar --verbose',
      },
    };
    projectConfiguration.targets['ci-storybook-publish'] = {
      executor: 'nx:run-commands',
      options: {
        command:
          'nx affected --base=$NX_BASE --head=$NX_HEAD --target=storybook-publish',
      },
    };
    projectConfiguration.targets['ci-release'] = {
      executor: 'nx:run-commands',
      options: {
        command: 'npx nx run-many --target=publish',
      },
    };
    writeJson(tree, 'project.json', projectConfiguration);
  }
}

function addSemver(tree: Tree) {
  addDependenciesToPackageJson(
    tree,
    {},
    convertDependenciesToObject([DEPENDENCIES.semver])
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/semver-config'),
    '.',
    {}
  );
  const projectConfiguration = readJson<ProjectConfiguration>(
    tree,
    'project.json'
  );
  if (!projectConfiguration.targets.sonar) {
    projectConfiguration.targets.release = {
      executor: '@jscutlery/semver:version',
      options: {
        syncVersions: true,
        preset: 'conventional',
        skipProjectChangelog: true,
        tagPrefix: '',
        push: true,
      },
    };
    writeJson(tree, 'project.json', projectConfiguration);
  }
}

function setupEditorConfig(tree: Tree) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/editor-config'),
    '.',
    {
      template: '',
    }
  );
}

function setupPrettier(tree: Tree) {
  addDependenciesToPackageJson(
    tree,
    {},
    convertDependenciesToObject([
      DEPENDENCIES.prettierEslint,
      DEPENDENCIES.eslintPluginPrettier,
    ])
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/prettier-config'),
    '.',
    {
      template: '',
    }
  );
  const eslintConfigPath = '.eslintrc.json';
  const eslintConfig = readJson(tree, eslintConfigPath);
  eslintConfig.overrides?.push({
    files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    rules: {
      'prettier/prettier': 'warn',
    },
    extends: ['plugin:prettier/recommended'],
  });
  writeJson(tree, eslintConfigPath, eslintConfig);
}

function setupEslintRules(tree: Tree) {
  const eslintConfigPath = '.eslintrc.json';
  const eslintConfig = readJson(tree, eslintConfigPath);
  eslintConfig.overrides?.push({
    files: ['*.ts', '*.tsx'],
    rules: {
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['private-constructors'],
        },
      ],
    },
  });
  writeJson(tree, eslintConfigPath, eslintConfig);
}

function addHusky(tree: Tree) {
  addDependenciesToPackageJson(
    tree,
    {},
    convertDependenciesToObject([
      DEPENDENCIES.husky,
      DEPENDENCIES.commitlintCli,
      DEPENDENCIES.commitlintConfigConventional,
    ])
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/husky-config'),
    '.',
    {}
  );
}
