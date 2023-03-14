import {
  cleanup,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { newProject } from '@okode/nx-plugin-testing-devkit';

describe('lighouse ci e2e', () => {
  const appName = uniq('test');
  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(async () => {
    newProject(
      [
        {
          name: '@okode/nx-lighthouse-ci',
          path: 'dist/packages/lighthouse-ci',
        },
      ],
      ['@nrwl/angular']
    );
    await runNxCommandAsync(
      `generate @nrwl/angular:application ${appName} --routing true --style scss --standalone false`
    );
    await runNxCommandAsync(
      `generate @okode/nx-lighthouse-ci:setup ${appName}`
    );
  }, 120000);

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
    cleanup();
  });

  it('should lighthous ci target exist', () => {
    const projectConfig = readJson(`apps/${appName}/project.json`);
    expect(projectConfig.targets['lighthouse-ci-check']).toBeDefined();
  });
});
