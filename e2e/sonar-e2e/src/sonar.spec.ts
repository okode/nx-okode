import {
  cleanup,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { newProject } from '@okode/nx-plugin-testing-devkit';

describe('sonar e2e', () => {
  const appName = uniq('test');
  const sonarHostUrl = 'http://localhost:9200';
  const sonarProjKey = 'pkey';
  const sonarProjName = 'pname';
  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(async () => {
    newProject(
      [
        { name: '@okode/nx-sonar', path: 'dist/packages/sonar' },
        { name: '@okode/nx-plugin-devkit', path: 'dist/packages/plugin-devkit' }
      ],
      ['@nrwl/react']
    );
    await runNxCommandAsync(`generate @nrwl/react:app ${appName} --routing=false`);
    await runNxCommandAsync(`generate @okode/nx-sonar:setup ${appName} --sonarHostUrl ${sonarHostUrl} --sonarProjectKey ${sonarProjKey} --sonarProjectName ${sonarProjName}`);
  }, 120000);

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
    cleanup();
  });

  it('should sonar target exist', () => {
    const projectConfig = readJson(`apps/${appName}/project.json`);
    expect(projectConfig.targets.sonar).toBeDefined();
  });

  it('should sonar target configured', () => {
    const projectConfig = readJson(`apps/${appName}/project.json`);
    expect(projectConfig.targets.sonar.options.hostUrl).toBe(sonarHostUrl);
    expect(projectConfig.targets.sonar.options.config['sonar.projectKey']).toBe(sonarProjKey);
    expect(projectConfig.targets.sonar.options.config['sonar.projectName']).toBe(sonarProjName);
  });
});