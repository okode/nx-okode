import { applicationGenerator } from '@nrwl/angular/generators';
import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  installPackagesTask,
  joinPathFragments,
  names,
  readJson,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
  writeJson,
} from '@nrwl/devkit';
import { convertDependenciesToObject, DEPENDENCIES } from '../../utils/dependencies';
import { ApplicationGeneratorSchema } from './schema';

interface NormalizedSchema extends ApplicationGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectE2EName: string;
  projectE2ERoot: string;
}

function normalizeOptions(
  tree: Tree,
  options: ApplicationGeneratorSchema
): NormalizedSchema {
  const projectName = names(options.name).fileName;
  const projectE2EName = `${projectName}-e2e`;
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectName}`;
  const projectE2ERoot = `${getWorkspaceLayout(tree).appsDir}/${projectE2EName}`;
  return {
    ...options,
    projectName,
    projectRoot,
    projectE2EName,
    projectE2ERoot
  };
}

export default async function (tree: Tree, options: ApplicationGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  await applicationGenerator(tree, {
    name: normalizedOptions.projectName,
    style: 'scss',
    standalone: false,
    routing: true
  });
  setupApplication(tree, normalizedOptions);
  setupE2EApplication(tree, normalizedOptions);
  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}

function setupApplication(tree: Tree, options: NormalizedSchema) {
  setupPrettier(tree, options);
  setupBaseProjectTargetsConfig(tree, options);
  setupBundleAnalyzer(tree, options);
  setupOptimizeAssets(tree, options);
  setupDockerPublishToNexus(tree, options);
  setupNycCodeCoverageForE2e(tree, options);
}

function setupE2EApplication(tree: Tree, options: NormalizedSchema) {
  setupCypressConfig(tree, options);
  setupPercy(tree, options);
}

function setupCypressConfig(tree: Tree, options: NormalizedSchema) {
  // Adds cypress config files
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/cypress-config'),
    options.projectE2ERoot,
    {
      template: ''
    }
  );
  // Register Cypress libs
  addDependenciesToPackageJson(tree, {}, convertDependenciesToObject([
    DEPENDENCIES.cypressCodeCoverage,
    DEPENDENCIES.cypressGrep,
    DEPENDENCIES.cypressRealEvents,
    DEPENDENCIES.cypressReplay,
    DEPENDENCIES.cypressTestingLibrary
  ]));
  const supportE2EFile = `${options.projectE2ERoot}/src/support/e2e.ts`;
  if (tree.exists(supportE2EFile)) {
    let supportE2E = tree.read(supportE2EFile).toString('utf-8');
    supportE2E += "\nimport '@cypress/code-coverage/support';\nimport '@testing-library/cypress/add-commands';\n import '@percy/cypress';\nimport 'cypress-real-events/support';\n// @ts-ignore\nimport registerCypressGrep from '@cypress/grep';\nregisterCypressGrep();";
    tree.write(supportE2EFile, supportE2E);
  }
  // Update tsconfig
  const tsconfigPath = `${options.projectE2ERoot}/tsconfig.json`;
  const tsconfig = readJson(tree, tsconfigPath);
  tsconfig.compilerOptions?.types?.push(
    "@testing-library/cypress",
    "@percy/cypress",
    "cypress-real-events",
    "@cypress/grep"
  );
  // REVIEW: Updates cypress e2e target
  const projectConfiguration = readProjectConfiguration(tree, options.projectE2EName);
  if (projectConfiguration.targets.e2e) {
    projectConfiguration.targets.e2e.configurations = projectConfiguration.targets.e2e.configurations ?? {};
    projectConfiguration.targets.e2e.configurations.ci = {
      "devServerTarget": "generacionyoung:serve:e2e",
      "record": true
    };
    projectConfiguration.targets.e2e.configurations['record-backend'] = {
      "devServerTarget": "generacionyoung:serve",
      "env": {
        "REPLAY_RECORD_REQUESTS": 1
      }
    };
  }
  // Adds .gitignore entries for Cypress
  const ignoreFile = `${options.projectE2ERoot}/.gitignore`;
  if (tree.exists(ignoreFile)) {
    let gitIgnore = tree.read(ignoreFile).toString('utf-8');
    gitIgnore += '\n# Cypress files (nx-angular setup generator)\ncypress/videos/\ncypress/screenshots';
    tree.write(ignoreFile, gitIgnore);
  }
  writeJson(tree, tsconfigPath, tsconfig);
}

function setupPercy(tree: Tree, options: NormalizedSchema) {
  addDependenciesToPackageJson(tree, {}, convertDependenciesToObject([
    DEPENDENCIES.cypressPercy,
  ]));
  const projectConfiguration = readProjectConfiguration(tree, options.projectE2EName);
  if (!projectConfiguration.targets['percy-e2e']) {
    projectConfiguration.targets['percy-e2e'] = {
      "executor": "nx:run-commands",
      "options": {
        "command": `npx @percy/cli exec -- nx run ${options.projectE2EName}:e2e`
      },
      "configurations": {
        "ci": {
          "command": `npx @percy/cli exec -c apps/${options.projectE2EName}/.percy.yml -- nx run ${options.projectE2EName}:e2e:ci`
        }
      }
    };
    updateProjectConfiguration(tree, options.projectName, projectConfiguration);
    generateFiles(
      tree,
      joinPathFragments(__dirname, './files/src/percy-config'),
      options.projectE2ERoot,
      {}
    );
  }
}

function setupPrettier(tree: Tree, options: NormalizedSchema) {
  addDependenciesToPackageJson(tree, {}, convertDependenciesToObject([
    DEPENDENCIES.prettierEslint,
    DEPENDENCIES.prettierEslint,
  ]));
  const eslintConfigPath = `${options.projectRoot}/.eslintrc.json`;
  const eslintConfig = readJson(tree, eslintConfigPath);
  eslintConfig.overrides?.push({
    "files": ["*.html"],
    "excludedFiles": ["*inline-template-*.component.html"],
    "extends": ["plugin:prettier/recommended"],
    "rules": {
      "prettier/prettier": [
        "warn",
        {
          "parser": "angular"
        }
      ]
    }
  });
  writeJson(tree, eslintConfigPath, eslintConfig);
}

function setupBaseProjectTargetsConfig(tree: Tree, options: NormalizedSchema) {
  const projectConfiguration = readProjectConfiguration(tree, options.projectName);
  if (projectConfiguration.targets.build) {
    // Changes executor to be able to override webpack config on build time
    projectConfiguration.targets.build.executor = '@nrwl/angular:webpack-browser';
    // Enables vendorChunk for all configurations
    projectConfiguration.targets.build.options.vendorChunk = true;
    Object.values(projectConfiguration.targets.build.configurations).forEach(c => {
      delete c.vendorChunk;
    });
    // Adds production budgets
    if (projectConfiguration.targets.build.configurations.production) {
      projectConfiguration.targets.build.configurations.production.budgets = [
        {
          "type": "bundle",
          "name": "vendor",
          "maximumWarning": "450kb",
          "maximumError": "500kb"
        },
        {
          "type": "initial",
          "maximumWarning": "550kb",
          "maximumError": "600kb"
        },
        {
          "type": "anyComponentStyle",
          "maximumWarning": "15kb",
          "maximumError": "20kb"
        }
      ];
    }
    if (projectConfiguration.targets.build.configurations.production) {
      projectConfiguration.targets.build.configurations.production.budgets = [
        {
          "type": "bundle",
          "name": "vendor",
          "maximumWarning": "500kb",
          "maximumError": "800kb"
        },
        {
          "type": "initial",
          "maximumWarning": "600kb",
          "maximumError": "900kb"
        },
        {
          "type": "anyComponentStyle",
          "maximumWarning": "15kb",
          "maximumError": "20kb"
        }
      ];
    }
  }
  if (projectConfiguration.targets.serve) {
    // Changes executor to be able to override webpack config on build time
    projectConfiguration.targets.serve.executor = '@nrwl/angular:webpack-dev-server';
    projectConfiguration.targets.serve.options = projectConfiguration.targets.serve.options ?? {};
    projectConfiguration.targets.serve.options.host = '0.0.0.0';
    /**
    if (!projectConfiguration.targets.build.configurations.e2e) {
      projectConfiguration.targets.build.configurations.e2e = {
        "browserTarget": "generacionyoung:build:development",
        "extraWebpackConfig": "apps/generacionyoung-e2e/coverage.webpack.js"
      };
    }
     */
  }
  updateProjectConfiguration(tree, options.projectName, projectConfiguration);
}

function setupBundleAnalyzer(tree: Tree, options: NormalizedSchema) {
  const projectConfiguration = readProjectConfiguration(tree, options.projectName);
  if (!projectConfiguration.targets['bundle-analyzer']) {
    projectConfiguration.targets['bundle-analyzer'] = {
      "executor": "nx:run-commands",
      "options": {
        "command": `nx run ${options.projectName}:build:production --statsJson && npx webpack-bundle-analyzer dist/apps/${options.projectName}/browser/stats.json`
      }
    };
    updateProjectConfiguration(tree, options.projectName, projectConfiguration);
  }
}

function setupOptimizeAssets(tree: Tree, options: NormalizedSchema) {
  const projectConfiguration = readProjectConfiguration(tree, options.projectName);
  if (!projectConfiguration.targets['optimize-assets']) {
    projectConfiguration.targets['optimize-assets'] = {
      "executor": "nx:run-commands",
      "options": {
        "command": `npx @funboxteam/optimizt apps/${options.projectName}/src/assets`
      }
    };
    updateProjectConfiguration(tree, options.projectName, projectConfiguration);
  }
}

function setupDockerPublishToNexus(tree: Tree, options: NormalizedSchema) {
  const projectConfiguration = readProjectConfiguration(tree, options.projectName);
  if (!projectConfiguration.targets['publish-docker']) {
    projectConfiguration.targets['publish-docker'] = {
      "executor": "@nx-tools/nx-container:build",
      "options": {
        "engine": "docker",
        "add-hosts": ["nexusregistry.internal.mapfredigitalhealth.com:10.10.81.20"],
        "tags": [
          `nexusregistry.internal.mapfredigitalhealth.com/${options.projectName}:$WORKSPACE_VERSION`
        ],
        "push": true
      }
    };
    updateProjectConfiguration(tree, options.projectName, projectConfiguration);
    generateFiles(
      tree,
      joinPathFragments(__dirname, './files/src/publish-docker-config'),
      options.projectRoot,
      {
        projectName: options.projectName,
        template: ''
      }
    );
  }
}

function setupNycCodeCoverageForE2e(tree: Tree, options: NormalizedSchema) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/nyc-app-coverage'),
    options.projectRoot,
    {
      projectName: options.projectName,
      projectE2EName: options.projectE2EName,
      template: ''
    }
  );
  const projectConfiguration = readProjectConfiguration(tree, options.projectName);
  if (projectConfiguration.targets.build && !projectConfiguration.targets.build.configurations.e2e) {
    projectConfiguration.targets.build.configurations.e2e = {
      "customWebpackConfig": {
        "path": `apps/${options.projectName}/coverage.webpack.js`
      }
    };
  }
  if (projectConfiguration.targets.serve && !projectConfiguration.targets.serve.configurations.e2e) {
    projectConfiguration.targets.serve.configurations.e2e = {
      "browserTarget": "generacionyoung:build:e2e",
    };
  }
  updateProjectConfiguration(tree, options.projectName, projectConfiguration);
  const ignoreFile = `${options.projectRoot}/.gitignore`;
  if (tree.exists(ignoreFile)) {
    let gitIgnore = tree.read('.gitignore').toString('utf-8');
    gitIgnore += '\n# nyc files (nx-angular setup generator)\n.nyc_output/\ncoverage/';
    tree.write(ignoreFile, gitIgnore);
  }
}