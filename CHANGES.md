# TypeORM with support for the PlanetScale Serverless driver on Cloudflare Workers

## About

TypeORM does not work with PlanetScale or Cloudflare Workers out of the box. Several changes where required in order to get it working.

### Disable Foreign Keys

PlanetScale does not allow foreign key constraints so all foreign key operations need to be disabled when a PlanetScale driver is in operation. 

This was implemented as the flag `disableForeignKeyConstraints` in the `DataSourceOptions`. Set this flag to `true` to disable foreign keys.

This was implemented at the `DataSourceOptions` level rather than the driver level so that the functionality could be reused for other drivers. For instance long running migrations using the PlanetScale driver do not work well due to PlanetScale's 20 second query timeout for the Serverless driver, but we can run those migrations on PlanetScale using the MySql driver with `disableForeignKeyConstraints` turned on.

### PlanetScale Driver and QueryRunner

The `PlanetScaleDriver` and `PlanetScaleQueryRunner` are both based on their MySql counterparts. They have been modified and in many cases simplified to work with PlanetScale.

The `PlanetScaleDriver` uses a [customized version](https://github.com/kamsheffield/planetscale-database-js/blob/typeorm-cloudflare/CHANGES.md) of the PlanetScale Serverless driver for Javascript that is compatible with TypeORM.

### Browser Build

Cloudflare Workers do not support Nodejs and instead run on a customized V8 runtime. The TypeORM browser build had many additional drivers that aren't needed. In order to trim down the build size, all drivers are stubbed except for the `PlanetScaleDriver`. See the `package.json` file for more information.

### Tests

Tests were modified to account for both when `disableForeignKeyConstraints` is enabled as well as when the current driver under test is the `PlanetScaleDriver`.

No additional tests have been added (yet).

## Developing

### Building for Release

`npm run package` 

`npm run pack`

### Running Tests

Enable the driver you want to test in the `ormconfig.json` and then run one of the following commands to start testing.

* All tests: `npm test`
* grep: `npm test -- --grep="many-to-one"`
* Folder: `./node_modules/mocha/bin/_mocha --file ./build/compiled/test/utils/test-setup.js --bail --recursive --timeout 90000 ./build/compiled/test/github-issues/`
* File: `./node_modules/mocha/bin/_mocha --file ./build/compiled/test/utils/test-setup.js --bail --recursive --timeout 90000 ./build/compiled/test/integration/sample1-simple-entity.js`

### Code Formatter

`npm run format`

### Branching

* **master**: Tracks the master branch from upstream: `git@github.com:typeorm/typeorm.git`
* **planetscale-cloudflare**: Contains the changes to `TypeORM` for compatibility with PlanetScale on Cloudflare Workers.

### Integration

* Checkout `master` and pull the latest upstream `master`.
* Create a new `integration` branch off of `planetscale-cloudflare` and merge the changes from `master`. 
* Fix any conflicts as needed.
* Run the build.
* Run the tests on the following three configurations: planetscale-serverless, mariadb, mariadb-nofk.
* Merge the changes into `planetscale-cloudflare`.
