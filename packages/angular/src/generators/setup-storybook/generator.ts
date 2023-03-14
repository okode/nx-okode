import {
  addDependenciesToPackageJson,
  generateFiles,
  getPackageManagerCommand,
  getWorkspaceLayout,
  installPackagesTask,
  joinPathFragments,
  names,
  NX_VERSION,
  readJson,
  Tree,
  workspaceRoot,
  writeJson,
} from '@nrwl/devkit';
import { SetupStorybookGeneratorSchema } from './schema';
import { storybookConfigurationGenerator } from '@nrwl/angular/generators';
import {
  convertDependenciesToObject,
  DEPENDENCIES,
  NX_DEPENDENCIES,
} from '../../utils/dependencies.constants';
import { tsquery } from '@phenomnomnominal/tsquery';
import { queryAngularTsFile } from '../../utils/tsquery.utils';
import { Linter } from '@nrwl/linter';
import { ArrayLiteralExpression } from 'typescript';
import { execSync } from 'child_process';
import { formatProjectFiles } from '@okode/nx-plugin-devkit';

interface NormalizedSchema extends SetupStorybookGeneratorSchema {
  projectName: string;
  projectRoot: string;
}

function normalizeOptions(
  tree: Tree,
  options: SetupStorybookGeneratorSchema
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
  options: SetupStorybookGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  const pmc = getPackageManagerCommand();
  const installDevDepsCmd = `${pmc.addDev} --save-exact ${NX_DEPENDENCIES.storybook}@${NX_VERSION}`;
  execSync(installDevDepsCmd, { cwd: workspaceRoot, stdio: [0, 1, 2] });
  await storybookConfigurationGenerator(tree, {
    name: options.appName,
    tsConfiguration: true,
    generateStories: false,
    generateCypressSpecs: false,
    configureCypress: false,
    linter: Linter.EsLint,
  });
  addStorybookDependencies(tree);
  addStorybookConfig(tree, normalizedOptions);
  updateStorybookMainFile(tree, normalizedOptions);
  updateStorybookTsconfig(tree, normalizedOptions);
  await formatProjectFiles(tree, [normalizedOptions.projectName]);
  return () => {
    installPackagesTask(tree);
  };
}

function addStorybookDependencies(tree: Tree) {
  addDependenciesToPackageJson(
    tree,
    {},
    {
      ...convertDependenciesToObject([DEPENDENCIES.storybookManagerWebpack5]),
    }
  );
  // Override dependencies for compatibility (REVIEW when storybook 7 is released)
  const packageJson = readJson(tree, 'package.json');
  packageJson.overrides = packageJson.overrides ?? {};
  const reactVersion = '^18.2.0';
  packageJson.overrides['zone.js'] = '~0.12.0';
  packageJson.overrides['react'] = reactVersion;
  packageJson.overrides['react-dom'] = reactVersion;
  packageJson.overrides['react-refresh'] = '0.13.0';
  writeJson(tree, 'package.json', packageJson);
}

function addStorybookConfig(tree: Tree, options: NormalizedSchema) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/config'),
    joinPathFragments(options.projectRoot, '.storybook'),
    {
      template: '',
      projectName: options.projectName,
    }
  );
}

function updateStorybookMainFile(tree: Tree, options: NormalizedSchema) {
  const pathToStorybookMainFile = joinPathFragments(
    options.projectRoot,
    '.storybook',
    'main.ts'
  );
  const { fileContents } = queryAngularTsFile(tree, pathToStorybookMainFile);

  const newFileContents = tsquery.replace(
    fileContents,
    'VariableDeclaration:has(Identifier[name=config]) PropertyAssignment:has(Identifier[name=stories]) > ArrayLiteralExpression',
    (node) => {
      const stories = node as ArrayLiteralExpression;
      const text = stories.getText();
      // TODO: review
      return `${text.slice(
        0,
        text.length - 1
      )} '../../../libs/**/*.stories.mdx',
    '../../../libs/**/*.stories.@(js|jsx|ts|tsx)',
    'docs/**/*.stories.mdx']`;
    },
    { visitAllChildren: true }
  );

  tree.write(pathToStorybookMainFile, newFileContents);
}

function updateStorybookTsconfig(tree: Tree, options: NormalizedSchema) {
  const storybookTsConfigFilePath = joinPathFragments(
    options.projectRoot,
    '.storybook',
    'tsconfig.json'
  );
  const tsconfig = readJson(tree, storybookTsConfigFilePath);
  tsconfig.include = tsconfig.include ?? [];
  tsconfig.include.push(
    '../../../libs/**/*.stories.ts',
    '../../../libs/**/*.stories.js',
    '../../../libs/**/*.stories.jsx',
    '../../../libs/**/*.stories.tsx',
    '../../../libs/**/*.stories.mdx',
    '../../../libs/**/*.component.ts'
  );
  writeJson(tree, storybookTsConfigFilePath, tsconfig);
}
