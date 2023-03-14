import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import {
  readProjectConfiguration,
  addProjectConfiguration,
} from '@nrwl/devkit';
import setupSonar from './generator';

describe('Setup sonar generator', () => {
  it('should generate target', async () => {
    const appTree = setupEmptyProject();
    await setupSonar(appTree, {
      appName: 'my-app',
      sonarHostUrl: 'sonar.url.com',
      sonarProjectKey: 'my-app-key',
      sonarProjectName: 'test',
    });
    expect(
      readProjectConfiguration(appTree, 'my-app').targets.sonar
    ).toBeDefined();
  });

  it('should add git ignores', async () => {
    const appTree = setupEmptyProject();
    appTree.write('.gitignore', '');
    await setupSonar(appTree, {
      appName: 'my-app',
      sonarHostUrl: 'sonar.url.com',
      sonarProjectKey: 'my-app-key',
      sonarProjectName: 'test',
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
