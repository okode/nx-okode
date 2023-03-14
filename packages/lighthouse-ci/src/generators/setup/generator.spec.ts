import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import {
  readProjectConfiguration,
  addProjectConfiguration,
} from '@nrwl/devkit';
import setupLighthouse from './generator';

describe('Setup lighthouse ci generator', () => {
  it('should generate target', async () => {
    const appTree = setupEmptyProject();
    await setupLighthouse(appTree, {
      appName: 'my-app',
      serverCommand: 'nx run test:serve',
    });
    expect(
      readProjectConfiguration(appTree, 'my-app').targets['lighthouse-ci-check']
    ).toBeDefined();
  });

  it('should add git ignores', async () => {
    const appTree = setupEmptyProject();
    appTree.write('.gitignore', '');
    await setupLighthouse(appTree, {
      appName: 'my-app',
    });
    expect(appTree.read('.gitignore').toString()).toContain('.lighthouseci');
  });

  it('should add lighthouse config', async () => {
    const appTree = setupEmptyProject();
    await setupLighthouse(appTree, {
      appName: 'my-app',
    });
    expect(appTree.exists('apps/my-app/.lighthouserc.json')).toBe(true);
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
