export const DEPENDENCIES = {
  semver: {
    name: '@jscutlery/semver',
    version: '~2.30.1',
  },
  eslintPluginPrettier: {
    name: 'eslint-plugin-prettier',
    version: '~4.2.1',
  },
  prettierEslint: {
    name: 'prettier-eslint',
    version: '~15.0.1',
  },
  husky: {
    name: 'husky',
    version: '~8.0.0',
  },
  commitlintCli: {
    name: '@commitlint/cli',
    version: '~17.4.4',
  },
  commitlintConfigConventional: {
    name: '@commitlint/config-conventional',
    version: '~17.4.4',
  },
  cypressCodeCoverage: {
    name: '@cypress/code-coverage',
    version: '~3.10.0',
  },
  cypressGrep: {
    name: '@cypress/grep',
    version: '~3.1.4',
  },
  cypressPercy: {
    name: '@percy/cypress',
    version: '~3.1.2',
  },
  cypressTestingLibrary: {
    name: '@testing-library/cypress',
    version: '~9.0.0',
  },
  cypressRealEvents: {
    name: 'cypress-real-events',
    version: '~1.7.6',
  },
  cypressReplay: {
    name: 'cypress-replay',
    version: '~1.0.16',
  },
} as const;

export const convertDependenciesToObject = (
  deps: { name: string; version: string }[]
) => {
  return deps.reduce((obj, dep) => ({ ...obj, [dep.name]: dep.version }), {});
};
