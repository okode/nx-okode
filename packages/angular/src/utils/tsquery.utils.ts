import { Tree, ensurePackage } from '@nrwl/devkit';
import { tsquery } from '@phenomnomnominal/tsquery';
import { DEPENDENCIES } from './dependencies.constants';

export function queryAngularTsFile(tree: Tree, pathToFile: string) {
  ensurePackage<typeof import('typescript')>(
    DEPENDENCIES.typescript.name,
    DEPENDENCIES.typescript.version
  );
  // read the content of app module
  const fileContents = tree.read(pathToFile, 'utf-8');
  const ast = tsquery.ast(fileContents);
  return { ast, fileContents };
}
