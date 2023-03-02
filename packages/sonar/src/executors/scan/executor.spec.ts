import executor from './executor';
import { ExecutorContext } from '@nrwl/devkit';
import * as sonarScanner from 'sonarqube-scanner';

describe('Sonar Scan Executor', () => {
  const originalProcessEnv = process.env;
  const projectVersion = expect.anything();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules()
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    process.env = originalProcessEnv;
  });

  it('should scan project and dependencies', async () => {
    mockSonarScan(true);

    const output = await executor({
      hostUrl: 'http://localhost:9200',
      config: {}
    }, getMockExecutorContext());
    expect(output.success).toBe(true);
  });

  it('should error on sonar scanner issue', async () => {
    mockSonarScan(false);

    const output = await executor(
      {
        hostUrl: 'url',
        config: {}
      },
      getMockExecutorContext()
    );
    expect(output.success).toBeFalsy();
  });

  describe('when "autoSourcesDetection" is deactivated', () => {
    it('should scan project with the provided scan config', async () => {
      const scanSpy = mockSonarScan(true);

      const scanConfig = {
        "sonar.projectKey": "kkk",
        "sonar.projectName": "test",
        "sonar.sources": "src/**/*",
        "sonar.tests": "test/**/*"
      };
      await executor({
        hostUrl: 'http://localhost:9200',
        config: scanConfig,
        autoSourcesDetection: false
      }, getMockExecutorContext());

      expect(scanSpy).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:9200',
        options: scanConfig
      })
    });
  });

  describe('when "autoSourcesDetection" is activated or not informed', () => {
    it('should scan project with the right scan options', async () => {
      const scanSpy = mockSonarScan(true);

      const scanConfig = {
        "sonar.projectKey": "kkk",
        "sonar.projectName": "test"
      };
      await executor({
        hostUrl: 'http://localhost:9200',
        config: scanConfig,
        autoSourcesDetection: true
      }, getMockExecutorContext());

      expect(scanSpy).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:9200',
        options: {
          "sonar.projectKey": "kkk",
          "sonar.projectName": "test",
          "sonar.sources": "apps/app1/src",
          "sonar.tests": "apps/app1/src",
          "sonar.projectVersion": projectVersion
        }
      });
    });

    describe('when project overrides an auto config value', () => {
      it('should scan project with the right scan options adding extra sources', async () => {
        const scanSpy = mockSonarScan(true);

        const scanConfig = {
          "sonar.projectKey": "kkk",
          "sonar.projectName": "test",
          "sonar.sources": "src/**/*",
        };
        await executor({
          hostUrl: 'http://localhost:9200',
          config: scanConfig,
          autoSourcesDetection: true
        }, getMockExecutorContext());

        expect(scanSpy).toHaveBeenCalledWith({
          serverUrl: 'http://localhost:9200',
          options: {
            "sonar.projectKey": "kkk",
            "sonar.projectName": "test",
            "sonar.sources": "apps/app1/src,src/**/*",
            "sonar.tests": "apps/app1/src",
            "sonar.projectVersion": projectVersion
          }
        });
      });

      it('should scan project with the right scan options adding test files', async () => {
        const scanSpy = mockSonarScan(true);

        const scanConfig = {
          "sonar.projectKey": "kkk",
          "sonar.projectName": "test",
          "sonar.tests": "test/**/*",
        };
        await executor({
          hostUrl: 'http://localhost:9200',
          config: scanConfig,
          autoSourcesDetection: true
        }, getMockExecutorContext());

        expect(scanSpy).toHaveBeenCalledWith({
          serverUrl: 'http://localhost:9200',
          options: {
            "sonar.projectKey": "kkk",
            "sonar.projectName": "test",
            "sonar.sources": "apps/app1/src",
            "sonar.tests": "apps/app1/src,test/**/*",
            "sonar.projectVersion": projectVersion
          }
        });
      });

      it('should scan project with the right scan options overriding project version', async () => {
        const scanSpy = mockSonarScan(true);

        const scanConfig = {
          "sonar.projectKey": "kkk",
          "sonar.projectName": "test",
          "sonar.projectVersion": "1.0.0"
        };
        await executor({
          hostUrl: 'http://localhost:9200',
          config: scanConfig,
          autoSourcesDetection: true
        }, getMockExecutorContext());

        expect(scanSpy).toHaveBeenCalledWith({
          serverUrl: 'http://localhost:9200',
          options: {
            "sonar.projectKey": "kkk",
            "sonar.projectName": "test",
            "sonar.sources": "apps/app1/src",
            "sonar.tests": "apps/app1/src",
            "sonar.projectVersion": "1.0.0"
          }
        });
      });
    });

    describe('when option value has custom sintaxis to be expanded', () => {
      it('should scan project with the right scan options', async () => {
        const scanSpy = mockSonarScan(true);

        const scanConfig = {
          "sonar.projectKey": "kkk",
          "sonar.projectName": "test",
          "sonar.sources": "src/**/*",
          "sonar.tests": "test/**/*",
          "sonar.eslint.reportPaths": "[lint-results/{projectRoot}/lint-results.json]"
        };
        await executor({
          hostUrl: 'http://localhost:9200',
          config: scanConfig,
          autoSourcesDetection: true
        }, getMockExecutorContext());

        expect(scanSpy).toHaveBeenCalledWith({
          serverUrl: 'http://localhost:9200',
          options: {
            "sonar.projectKey": "kkk",
            "sonar.projectName": "test",
            "sonar.sources": "apps/app1/src,src/**/*",
            "sonar.tests": "apps/app1/src,test/**/*",
            "sonar.eslint.reportPaths": "lint-results/apps/app1/lint-results.json",
            "sonar.projectVersion": projectVersion
          }
        });
      });
    });
  });

  describe('when env variables are used in options', () => {
    it('should interpolate env variables', async () => {
      process.env['PROJECT_KEY'] = 'myproject';
      process.env['SONAR_HOST'] = 'http://localhost:9200';
      const scanSpy = mockSonarScan(true);

      const scanConfig = {
        "sonar.projectKey": "$PROJECT_KEY",
        "sonar.projectName": "$PROJECT_NAME", // Missing env variable
        "sonar.sources": "src/**/*",
        "sonar.tests": "test/**/*",
      };
      await executor({
        hostUrl: '$SONAR_HOST',
        config: scanConfig,
        autoSourcesDetection: true
      }, getMockExecutorContext());

      expect(scanSpy).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:9200',
        options: {
          "sonar.projectKey": "myproject",
          "sonar.projectName": "",
          "sonar.sources": "apps/app1/src,src/**/*",
          "sonar.tests": "apps/app1/src,test/**/*",
          "sonar.projectVersion": projectVersion
        }
      });
    });
  });

  describe('when "dryRun" option is enabled', () => {
    it('should not run sonar scanner', async () => {
      const scanSpy = mockSonarScan(true);

      const scanConfig = {
        "sonar.projectKey": "proj",
        "sonar.projectName": "projName",
        "sonar.sources": "src/**/*",
        "sonar.tests": "test/**/*",
      };
      await executor({
        hostUrl: 'http://localhost:4200/test',
        config: scanConfig,
        autoSourcesDetection: true,
        dryRun: true
      }, getMockExecutorContext());

      expect(scanSpy).not.toHaveBeenCalled();
    });
  });
});

const getMockExecutorContext: () => ExecutorContext = () => ({
  cwd: '',
  isVerbose: false,
  root: '',
  projectName: 'app1',
  workspace: {
    version: 2,
    projects: {
      app1: {
        root: 'apps/app1',
        sourceRoot: 'apps/app1/src',
        targets: {
          test: {
            executor: '',
            options: {
              jestConfig: 'jest.config.ts',
            },
          },
        },
      },
      lib1: {
        root: 'libs/lib1',
        sourceRoot: 'libs/lib1/src',
        targets: {
          test: {
            executor: '@nrwl/jest:jest',
            options: {
              jestConfig: 'jest.config.ts',
            },
          },
        },
      },
      lib2: {
        root: 'libs/lib2',
        sourceRoot: 'libs/lib2/src',
        targets: {
          test: {
            executor: '@nrwl/jest:jest',
            options: {
              jestConfig: 'jest.config.ts',
            },
          },
        },
      },
      lib3: {
        root: 'libs/lib3',
        sourceRoot: 'libs/lib3/src',
        targets: {
          test: {
            executor: '@nrwl/jest:jest',
            options: {
              jestConfig: 'jest.config.ts',
            },
          },
        },
      },
    },
  },
})

const mockSonarScan = (success: boolean) => {
  const scanSpy = jest.spyOn(sonarScanner, 'async');
  scanSpy.mockImplementation(() => {
    if (success) {
      return Promise.resolve(true);
    } else {
      return Promise.reject('ERROR MOCK');
    }
  });
  return scanSpy;
};
