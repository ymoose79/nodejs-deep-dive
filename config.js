/*
 * create and export config variables
 *
 */

// container for all the enviornments
const environments = {};

//staging (default) enviornments
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
  hashingSecret: 'thisIsASecret',
  maxChecks: 5
};

// production env
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
  hashingSecret: 'thisIsAlsoASecret',
  maxChecks: 5
};

// determine which enviornment was passed as a command-line argument
const currentEnvironment =
  typeof process.env.NODE_ENV == "string"
    ? process.env.NODE_ENV.toLowerCase()
    : "";

//check that the current environment is one of the environments above, if not, default to staging
const enviornmentToExport =
  typeof environments[currentEnvironment] == "object"
    ? environments[currentEnvironment]
    : environments.staging;

// export the module

module.exports = enviornmentToExport;
