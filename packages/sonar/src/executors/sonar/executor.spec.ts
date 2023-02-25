import { SonarExecutorSchema } from './schema';
import executor from './executor';
import { ExecutorContext } from '@nrwl/devkit';

const options: SonarExecutorSchema = {
  hostUrl: 'http://localhost:9200',
  config: {}
};

describe('Sonar Executor', () => {
  it('can run', async () => {
    const output = await executor(options, getMockExecutorContext());
    expect(output.success).toBe(true);
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
