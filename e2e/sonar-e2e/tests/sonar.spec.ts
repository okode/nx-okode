import {
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';

describe('sonar e2e', () => {
  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(() => {
    ensureNxProject('@nx-okode/sonar', 'dist/packages/sonar');
  });

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
  });

  it('should create sonar target for a project', async () => {
    const project = uniq('sonar');
    await runNxCommandAsync(`generate @okode/nx-sonar:setup-sonar ${project}`);
    const result = await runNxCommandAsync(`sonar ${project}`);
    expect(result.stdout).toContain('Executor ran');
  }, 120000);

  describe('--hostUrl', () => {
    it('should add hostUrl to the sonar target options', async () => {
      const project = uniq('sonar');
      await runNxCommandAsync(`generate @okode/nx-sonar:setup-sonar ${project} --hostUrl http://localhost:9200`);
      const projectJson = readJson(`apps/${project}/project.json`);
      expect(projectJson.targets['sonar'].options.hostUrl).toEqual('http://localhost:9200');
    }, 120000);
  });

  describe('--projectKey', () => {
    it('should add projectKey to the sonar target options', async () => {
      const project = uniq('sonar');
      await runNxCommandAsync(`generate @okode/nx-sonar:setup-sonar ${project} --projectKey sonarProjectKey`);
      const projectJson = readJson(`apps/${project}/project.json`);
      expect(projectJson.targets['sonar'].options.projectKey).toEqual('sonarProjectKey');
    }, 120000);
  });

  describe('--projectName', () => {
    it('should add projectName to the sonar target options', async () => {
      const project = uniq('sonar');
      await runNxCommandAsync(`generate @okode/nx-sonar:setup-sonar ${project} --projectName sonarProjectName`);
      const projectJson = readJson(`apps/${project}/project.json`);
      expect(projectJson.targets['sonar'].options.projectKey).toEqual('sonarProjectName');
    }, 120000);
  });
});