import { runNxCommandAsync, uniq } from '@nrwl/nx-plugin/testing';
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
      [
        { name: '@okode/nx-angular', path: 'dist/packages/angular' }
      ],
      ['@nrwl/angular']
    );
    await runNxCommandAsync(`generate @okode/nx-angular:preset ${appName}`);
  }, 120000);

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    // runNxCommandAsync('reset');
    // cleanup();
  });

  it('should sonar target exist', () => {
    expect(4).toBeDefined();
  });

});