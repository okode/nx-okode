import {
  runNxCommandAsync,
  uniq,
  checkFilesExist,
  cleanup,
} from '@nrwl/nx-plugin/testing';
import { newProject } from '@okode/nx-plugin-testing-devkit';

describe('angular e2e', () => {
  const appName = uniq('test');
  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(async () => {
    newProject(
      [{ name: '@okode/nx-angular', path: 'dist/packages/angular' }],
      ['@nrwl/angular']
    );
    await runNxCommandAsync(`generate @okode/nx-angular:preset ${appName}`);
  }, 120000);

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
    cleanup();
  });

  it('should run lint successfully', async () => {
    const { stdout } = await runNxCommandAsync(`run-many --target=lint`);
    expect(stdout).toMatch(/successfully ran/i);
  }, 30000);

  it('should run test successfully', async () => {
    const { stdout } = await runNxCommandAsync(`run-many --target=test`);
    expect(stdout).toMatch(/successfully ran/i);
  }, 60000);

  it('should run build successfully', async () => {
    const { stdout } = await runNxCommandAsync(`run-many --target=build`);
    expect(stdout).toMatch(/successfully ran/i);
  }, 60000);

  describe('with ssr for the application', () => {
    beforeAll(async () => {
      await runNxCommandAsync(
        `generate @okode/nx-angular:setup-ssr ${appName}`
      );
    }, 120000);

    it('should set up ssr', async () => {
      checkFilesExist(`apps/${appName}/server.ts`);
    });
  });
});
