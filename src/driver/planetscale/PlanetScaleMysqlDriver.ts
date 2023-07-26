import { DataSource } from "../../data-source/DataSource"
import { ConnectionIsNotSetError } from "../../error/ConnectionIsNotSetError"
import { DriverPackageNotInstalledError } from "../../error/DriverPackageNotInstalledError"
import { TypeORMError } from "../../error/TypeORMError"
import { PlatformTools } from "../../platform/PlatformTools"
import { DriverUtils } from "../DriverUtils"
import { PlanetScaleDriver } from "./PlanetScaleDriver"
import { PlanetScaleDataSourceCredentialsOptions } from "./PlanetScaleDataSourceCredentialsOptions"
import { PlanetScaleDataSourceOptions } from "./PlanetScaleDataSourceOptions"

/**
 * PlanetScale driver using the mysql package.
 */
export class PlanetScaleMysqlDriver extends PlanetScaleDriver {

    /**
     * This driver uses the mysql package to connect to PlanetScale.
     */
    readonly type = "mysql"

    /**
     * Mysql underlying library.
     */
    mysql: any

    /**
     * Connection pool.
     */
    pool: any

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(dataSource: DataSource) {
        super(dataSource)
        this.dataSource = dataSource
        this.options = {
            ...dataSource.options,
        } as PlanetScaleDataSourceOptions

        // load mysql package
        this.loadDependencies()

        this.database = DriverUtils.buildDriverOptions(this.options).database
    }

    /**
     * Performs connection to the database.
     */
    async connect(): Promise<void> {
        this.pool = await this.createPool(
            this.createConnectionOptions(this.options, this.options),
        )

        if (!this.database) {
            const queryRunner = await this.createQueryRunner("master")

            this.database = await queryRunner.getCurrentDatabase()

            await queryRunner.release()
        }

        const queryRunner = this.createQueryRunner("master")
        const result: {
            version: string
        }[] = await queryRunner.query(`SELECT VERSION() AS \`version\``)
        const dbVersion = result[0].version
        this.version = dbVersion
        await queryRunner.release()
    }

    /**
     * Closes connection with the database.
     */
    async disconnect(): Promise<void> {
        if (!this.pool)
            return Promise.reject(new ConnectionIsNotSetError("mysql"))

        if (this.pool) {
            return new Promise<void>((ok, fail) => {
                this.pool.end((err: any) => {
                    if (err) return fail(err)
                    this.pool = undefined
                    ok()
                })
            })
        }
    }

    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<any> {
        return new Promise<any>((ok, fail) => {
            if (this.pool) {
                this.pool.getConnection((err: any, dbConnection: any) => {
                    err ? fail(err) : ok(this.prepareDbConnection(dbConnection))
                })
            } else {
                fail(
                    new TypeORMError(
                        `Connection is not established with mysql database`,
                    ),
                )
            }
        })
    }

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any> {
        return this.obtainMasterConnection()
    }

    /**
     * Loads all driver dependencies.
     */
    protected loadDependencies(): void {
        const connectorPackage = "mysql"
        const fallbackConnectorPackage =
            connectorPackage === "mysql"
                ? ("mysql2" as const)
                : ("mysql" as const)
        try {
            // try to load first supported package
            this.mysql = PlatformTools.load(connectorPackage)

            /*
             * Some frameworks (such as Jest) may mess up Node's require cache and provide garbage for the 'mysql' module
             * if it was not installed. We check that the object we got actually contains something otherwise we treat
             * it as if the `require` call failed.
             *
             * @see https://github.com/typeorm/typeorm/issues/1373
             */
            if (Object.keys(this.mysql).length === 0) {
                throw new TypeORMError(
                    `'${connectorPackage}' was found but it is empty. Falling back to '${fallbackConnectorPackage}'.`,
                )
            }
        } catch (e) {
            try {
                this.mysql = PlatformTools.load(fallbackConnectorPackage) // try to load second supported package
            } catch (e) {
                throw new DriverPackageNotInstalledError(
                    "Mysql",
                    connectorPackage,
                )
            }
        }
    }

    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createConnectionOptions(
        options: PlanetScaleDataSourceOptions,
        credentials: PlanetScaleDataSourceCredentialsOptions,
    ): Promise<any> {
        credentials = Object.assign(
            {},
            credentials,
            DriverUtils.buildDriverOptions(credentials),
        ) // todo: do it better way

        // build connection options for the driver
        return Object.assign(
            {},
            {
                charset: options.mysql?.charset,
                timezone: options.mysql?.timezone,
                connectTimeout: options.mysql?.connectTimeout,
                insecureAuth: false,
                supportBigNumbers: options.mysql?.supportBigNumbers ?? false,
                bigNumberStrings: options.mysql?.bigNumberStrings ?? false,
                dateStrings: options.mysql?.dateStrings,
                debug: options.mysql?.debug,
                trace: options.mysql?.trace,
                multipleStatements: options.mysql?.multipleStatements,
                flags: options.mysql?.flags,
            },
            {
                host: credentials.host,
                user: credentials.username,
                password: credentials.password,
                database: credentials.database,
                port: credentials.port ?? 3306,
                ssl: credentials.ssl ?? true,
            },
            options.mysql?.acquireTimeout === undefined
                ? {}
                : { acquireTimeout: options.mysql.acquireTimeout },
            { connectionLimit: options.poolSize },
            options.extra || {},
        )
    }

    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createPool(connectionOptions: any): Promise<any> {
        // create a connection pool
        const pool = this.mysql.createPool(connectionOptions)

        // make sure connection is working fine
        return new Promise<void>((ok, fail) => {
            // (issue #610) we make first connection to database to make sure if connection credentials are wrong
            // we give error before calling any other method that creates actual query runner
            pool.getConnection((err: any, connection: any) => {
                if (err) return pool.end(() => fail(err))

                connection.release()
                ok(pool)
            })
        })
    }

    /**
     * Attaches all required base handlers to a database connection, such as the unhandled error handler.
     */
    private prepareDbConnection(connection: any): any {
        const { logger } = this.dataSource
        /*
         * Attaching an error handler to connection errors is essential, as, otherwise, errors raised will go unhandled and
         * cause the hosting app to crash.
         */
        if (connection.listeners("error").length === 0) {
            connection.on("error", (error: any) =>
                logger.log(
                    "warn",
                    `MySQL connection raised an error. ${error}`,
                ),
            )
        }
        return connection
    }
}
