import { Tree, formatFiles, workspaceRoot } from '@nrwl/devkit';
import { execSync } from 'child_process';

export async function formatAllFiles(
  tree: Tree,
  excludedProjectNames?: string[]
) {
  await formatFiles(tree);
  execSync(`nx format --all --excluded ${excludedProjectNames}`, {
    cwd: workspaceRoot,
    stdio: [0, 1, 2],
  });
}

export async function formatProjectFiles(tree: Tree, projectNames: string[]) {
  await formatFiles(tree);
  execSync(`nx format --projects ${projectNames}`, {
    cwd: workspaceRoot,
    stdio: [0, 1, 2],
  });
}
