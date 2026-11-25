import { createRuntimeConfigLoader } from '@open-dcp/angular-services';
import { publicPathUrl } from '../../../single-spa/asset-url';

/**
 * Loads `config.json` from the bundle's own folder (see CONFIG.md). The URL is resolved on load(),
 * after src/single-spa/set-public-path.ts has set the webpack public path.
 */
export const appConfigLoader = createRuntimeConfigLoader(() => publicPathUrl('config.json'));
