import { ExecutorContext, logger } from 'nx/src/devkit-exports';
import { ScanExecutorSchema } from './schema';
import * as sonarScanner from 'sonarqube-scanner';
import { AppInfo, getExecutedAppInfo } from '@okode/nx-plugin-devkit';

export default async function runExecutor(options: ScanExecutorSchema, context: ExecutorContext) {
  logger.log('Executor ran for Sonar', options);
  let success = true;
  try {
    await scan(options, context);
  } catch (e) {
    logger.error(`The Sonar scan failed for project '${context.projectName}'. Error: ${e}`);
    success = false;
  }
  return { success };
}

async function scan(options: ScanExecutorSchema, context: ExecutorContext) {
  logger.log(`Scanning project '${context.projectName}' with Sonar`);
  if (options.verbose) {
    logger.debug(`Scanning project '${context.projectName}' with Sonar and opts:`, options)
  }

  let scannerOptions = options.config;
  if (options.autoSourcesDetection) {
    logger.log(`Analyzing app dependencies to detect dependencies...`);
    const appInfo = await getExecutedAppInfo(context, { skipImplicitDeps: options.skipImplicitDeps });
    if (options.verbose) {
      logger.debug('App info:', appInfo);
    }
    scannerOptions = mergeScannerOptsWithAppInfo(scannerOptions, appInfo);
  }

  logger.debug('Sonar scanner config', options.hostUrl, scannerOptions);

  await sonarScanner.async({
    serverUrl: options.hostUrl,
    options: scannerOptions,
  });
}

function mergeScannerOptsWithAppInfo(scannerOptions: Record<string, string>, appInfo: AppInfo) {
  const newScannerOpts = { ...scannerOptions };
  newScannerOpts['sonar.sources'] = `${appInfo.workspaceSources}${
    newScannerOpts['sonar.sources'] ? `,${newScannerOpts['sonar.sources']}` : ''
  }`;
  newScannerOpts['sonar.tests'] = `${appInfo.workspaceSources}${
    newScannerOpts['sonar.tests'] ? `,${newScannerOpts['sonar.tests']}` : ''
  }`;

  return expandScannerOptions(newScannerOpts, appInfo);
}

function expandScannerOptions(scannerOptions: Record<string, string>, appInfo: AppInfo) {
  return Object.entries(scannerOptions).reduce((newScannerOpts, [optionKey, optionRawValue]) => {
    const optionRawValues = optionRawValue.split(',');
    newScannerOpts[optionKey] = optionRawValues
      .map(optionValue => {
        // Expand each scanner option value
        const match = optionValue.match(/^\[(.*)\]$/);
        if (match && match[1]) {
          const matchedFilePath = match[1] ?? '';
          // Replace vars
          const values = appInfo.workspaceDependencies
            .map(d => matchedFilePath.replace('{projectRoot}', d.root));
          return values.join(',');
        }
        return optionValue;
      })
      .join(',')
    return newScannerOpts;
  }, {});
}
