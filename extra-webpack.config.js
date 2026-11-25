const singleSpaAngularWebpack = require('single-spa-angular/lib/webpack').default;
const { ModuleFederationPlugin } = require('webpack').container;
const packageJson = require('./package.json');
const deps = packageJson.dependencies;
const name = packageJson.name;

module.exports = (angularWebpackConfig, options) => {
  const singleSpaWebpackConfig = singleSpaAngularWebpack(angularWebpackConfig, options);

  // Merge your custom Module Federation configuration
  singleSpaWebpackConfig.plugins.push(
    new ModuleFederationPlugin({
      // This is the unique name of your application
      name,
      shared: {
        // This is the key part for de-duplication
        "@open_dcp/services": {
          singleton: true,
          strictVersion: false,
          requiredVersion: deps['@open_dcp/services'],
        }
      }
    })
  );

  // Runtime public path is set by src/single-spa/set-public-path.ts; 'auto' cannot resolve this UMD bundle under SystemJS.
  singleSpaWebpackConfig.output.publicPath = '';

  // Feel free to modify this webpack config however you'd like to
  return singleSpaWebpackConfig;
}
