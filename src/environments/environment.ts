// Runtime settings come from config.json (see CONFIG.md).
// move env vars to constants

declare var require: any;
const packageJson = require('../../package.json');

export const environment: {[key: string]: any | any[], angularVersion: string} = {
  angularVersion: packageJson.dependencies["@angular/common"].split('.')[0],
  isAppValidated: true,
  appName: 'Side menu',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
