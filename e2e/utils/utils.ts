import { cleanup, ensureNxProject, patchPackageJsonForPlugin, runPackageManagerInstall, tmpProjPath } from '@nrwl/nx-plugin/testing';
import { execSync } from 'child_process';
import { joinPathFragments, readJsonFile, workspaceRoot, writeJsonFile } from '@nrwl/devkit';
import { getPackageManagerCommand } from '@nrwl/devkit';
import { dirname, join } from 'path';
import { ensureDirSync } from 'fs-extra'

interface Package {
  name: string;
  version: string;
}

interface ProjectDist {
  name: string;
  path: string;
}

export function newProject(
  plugins: ProjectDist[],
  nxPackagesToInstall?: string[],
  packagesToInstall?: Package[],
  projectName = 'proj'
): string {
  cleanup();
  ensureNxProjects(plugins);
  addNxPackages(nxPackagesToInstall);
  addPackages(packagesToInstall);
  return projectName;
}

export function getNxVersion(): string {
  const pkgJson = readJsonFile(
    joinPathFragments(workspaceRoot, 'package.json')
  );
  return (
    process.env.NX_VERSION ||
    pkgJson.dependencies['nx'] ||
    pkgJson.devDependencies['nx'] ||
    pkgJson.dependencies['@nrwl/workspace'] ||
    pkgJson.devDependencies['@nrwl/workspace'] ||
    'latest'
  );
}

function addNxPackages(pkgs?: string[]) {
  const nxPkgs = pkgs?.map(name => {
    const version = getNxVersion();
    return { name, version };
  });
  return addPackages(nxPkgs);
}

function addPackages(packages?: Package[]) {
  if (!packages || packages.length == 0) { return; }

  const pm = getPackageManagerCommand();
  const pkgsWithVersions = packages
    .map(({ name, version }) => `${name}@${version}`)
    .join(' ');
  const install = execSync(`${pm.addDev} ${pkgsWithVersions}`, {
    cwd: tmpProjPath(),
    stdio: [0, 1, 2],
    env: process.env,
    encoding: 'utf-8',
  });
  return install ?? '';
}

function ensureNxProjects(projs: ProjectDist[]): void {
  if (projs?.length === 1) {
    ensureNxProject(projs[0].name, projs[0].path);
  } else {
    ensureDirSync(tmpProjPath())
    runNxNewCommand(undefined, true);
    patchDistProjects(projs);
    for (const proj of projs) {
      patchPackageJsonForPlugin(proj.name, proj.path);
    }
    runPackageManagerInstall();
  }
}

function runNxNewCommand(args?: string, silent?: boolean) {
  const localTmpDir = dirname(tmpProjPath())
  return execSync(
    `node ${require.resolve(
      '@nrwl/tao',
    )} new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nrwl/workspace --npmScope=proj --preset=empty ${
      args || ''
    }`,
    {
      cwd: localTmpDir,
      ...(silent && false ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
    },
  )
}

function patchDistProjects(projs: ProjectDist[]): void {
  for (const proj of projs) {
    const absDistPath = join(process.cwd(), proj.path);
    const absPackageJson = join(absDistPath, 'package.json');
    const packageJson = readJsonFile(absPackageJson);
    const packageDeps = packageJson?.dependencies ?? {};
    for (const pkg of projs) {
      const absDistPath = `file:/${join(process.cwd(), pkg.path)}`
      if (packageDeps[pkg.name] && packageDeps[pkg.name] !== absDistPath) {
        packageDeps[pkg.name] = absDistPath;
      }
    }
    writeJsonFile(absPackageJson, { ...packageJson, dependencies: packageDeps })
  }
}
