import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  installPackagesTask,
  joinPathFragments,
  names,
  Tree,
} from '@nrwl/devkit';
import { SetupSsrGeneratorSchema } from './schema';
import { setupSsr } from '@nrwl/angular/generators';
import {
  convertDependenciesToObject,
  DEPENDENCIES,
} from '../../utils/dependencies.constants';
import { tsquery } from '@phenomnomnominal/tsquery';
import { queryAngularTsFile } from '../../utils/tsquery.utils';

interface NormalizedSchema extends SetupSsrGeneratorSchema {
  projectName: string;
  projectRoot: string;
}

function normalizeOptions(
  tree: Tree,
  options: SetupSsrGeneratorSchema
): NormalizedSchema {
  const projectName = names(options.appName).fileName;
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectName}`;
  return {
    ...options,
    projectName,
    projectRoot,
  };
}

export default async function (tree: Tree, options: SetupSsrGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  await setupSsr(tree, {
    project: normalizedOptions.projectName,
  });
  addBasicServerConfig(tree, normalizedOptions);
  addServerMiddlewares(tree, normalizedOptions);
  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}

function addBasicServerConfig(tree: Tree, options: NormalizedSchema) {
  const pathToServerTs = getPathToServerTs(options);
  const { ast, fileContents } = queryAngularTsFile(tree, pathToServerTs);

  const serverDeclarationNodes = tsquery(
    ast,
    'FunctionDeclaration:has(Identifier[name=app]) VariableStatement:has(Identifier[name=server])',
    { visitAllChildren: true }
  );

  if (serverDeclarationNodes.length === 0) {
    throw new Error(
      `Could not find server declaration in ${pathToServerTs}. Please ensure this is correct.`
    );
  }

  const serverDeclarationNode = serverDeclarationNodes[0];

  const serverConfig = `\nserver.disable('x-powered-by');` + `\n`;

  const newFileContents = `${fileContents.slice(
    0,
    serverDeclarationNode.getEnd()
  )}${serverConfig}${fileContents.slice(
    serverDeclarationNode.getEnd(),
    fileContents.length
  )}`;

  tree.write(pathToServerTs, newFileContents);
}

function addServerMiddlewares(tree: Tree, options: NormalizedSchema) {
  addDependenciesToPackageJson(
    tree,
    {},
    convertDependenciesToObject([DEPENDENCIES.semver])
  );
  addServerMiddlewaresToServerFile(tree, options);
}

function addServerMiddlewaresToServerFile(
  tree: Tree,
  options: NormalizedSchema
) {
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/src/server-middlewares'),
    joinPathFragments(options.projectRoot, 'server'),
    {
      template: '',
    }
  );
  const pathToServerTs = getPathToServerTs(options);
  const { ast, fileContents } = queryAngularTsFile(
    tree,
    getPathToServerTs(options)
  );

  const lastImportStatementNode = tsquery(ast, 'ImportDeclaration', {
    visitAllChildren: true,
  }).pop();
  const serverDeclarationNodes = tsquery(
    ast,
    'FunctionDeclaration:has(Identifier[name=app]) VariableStatement:has(Identifier[name=server])',
    { visitAllChildren: true }
  );

  if (serverDeclarationNodes.length === 0) {
    throw new Error(
      `Could not find server declaration in ${pathToServerTs}. Please ensure this is correct.`
    );
  }

  const serverDeclarationNode = serverDeclarationNodes[0];

  const newImporStatements =
    `\nimport { requestContext } from './server/interceptors/request-context';` +
    `\nimport { responseLogger } from './server/interceptors/response-logger';` +
    `\nimport compression from 'compression';\n`;

  const middlewares =
    `\nserver.use(compression());` +
    `\nserver.use(requestContext);` +
    `\nserver.use(responseLogger);`;

  const newFileContents = `${fileContents.slice(
    0,
    lastImportStatementNode?.getEnd() ?? 0
  )}${newImporStatements}${fileContents.slice(
    lastImportStatementNode.getEnd(),
    serverDeclarationNode.getEnd()
  )}${middlewares}${fileContents.slice(
    serverDeclarationNode.getEnd(),
    fileContents.length
  )}`;

  tree.write(pathToServerTs, newFileContents);
}

function getPathToServerTs(options: NormalizedSchema) {
  return joinPathFragments(options.projectRoot, 'server.ts');
}
