import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { readProjectConfiguration, addProjectConfiguration } from '@nrwl/devkit';
import setupSonar from './generator';

describe('Setup sonar generator', () => {
  it('should generate target', async () => {
    const appTree = setupEmptyProject();
    await setupSonar(appTree, {
      name: 'my-app',
      hostUrl: 'sonar.url.com',
      projectKey: 'my-app-key',
      projectName: 'test'
    });
    expect(
      readProjectConfiguration(appTree, 'my-app').targets.sonar
    ).toBeDefined();
  });

  it('should add git ignores', async () => {
    const appTree = setupEmptyProject();
    appTree.write('.gitignore', '');
    await setupSonar(appTree, {
      name: 'my-app',
      hostUrl: 'sonar.url.com',
      projectKey: 'my-app-key',
      projectName: 'test'
    });
    expect(appTree.read('.gitignore').toString()).toContain('.scannerwork');
  });
});

export const setupEmptyProject = () => {
  const appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  addProjectConfiguration(appTree, 'my-app', {
    root: 'apps/my-app',
    targets: {},
  });
  return appTree;
};