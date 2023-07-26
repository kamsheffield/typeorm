import { BaseDataSourceOptions } from "../../data-source/BaseDataSourceOptions"
import { PlanetScaleDataSourceCredentialsOptions } from "./PlanetScaleDataSourceCredentialsOptions"

/**
 * PlanetScale serverless specific connection options.
 *
 * @see https://github.com/planetscale/database-js
 */
export interface PlanetScaleDataSourceOptions
    extends BaseDataSourceOptions,
        PlanetScaleDataSourceCredentialsOptions {
    /**
     * The database type.
     */
    readonly type: "planetscale"

    /**
     * The type of connector to use.
     * This is used to determine which driver to use.
     * "mysql" will use the nodejs mysql package.
     * "serverless" will use the PlanetScale serverless driver for Javascript.
     */
    readonly connectorType: "serverless" | "mysql"

    /**
     * Pass configuration to the nodejs mysql package.
     */
    readonly mysql?: {
        /**
         * The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
         * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
         * Default: 'UTF8_GENERAL_CI'
         */
        readonly charset?: string

        /**
         * The timezone configured on the MySQL server.
         * This is used to type cast server date/time values to JavaScript Date object and vice versa.
         * This can be 'local', 'Z', or an offset in the form +HH:MM or -HH:MM. (Default: 'local')
         */
        readonly timezone?: string

        /**
         * When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option (Default: false)
         */
        readonly supportBigNumbers?: boolean

        /**
         * Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be always
         * returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving bigNumberStrings
         * disabled will return big numbers as String objects only when they cannot be accurately represented with
         * [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5) (which happens when they exceed the [-2^53, +2^53] range),
         * otherwise they will be returned as Number objects. This option is ignored if supportBigNumbers is disabled.
         */
        readonly bigNumberStrings?: boolean

        /**
         * Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript Date objects.
         * Can be true/false or an array of type names to keep as strings.
         */
        readonly dateStrings?: boolean | string[]

        /**
         * The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
         */
        readonly connectTimeout?: number

        /**
         * The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
         * This difference between connectTimeout and acquireTimeout is subtle and is described in the mysqljs/mysql docs
         * https://github.com/mysqljs/mysql/tree/master#pool-options
         */
        readonly acquireTimeout?: number

        /**
         * Prints protocol details to stdout. Can be true/false or an array of packet type names that should be printed.
         * (Default: false)
         */
        readonly debug?: boolean | string[]

        /**
         * Generates stack traces on Error to include call site of library entrance ("long stack traces").
         * Slight performance penalty for most calls. (Default: true)
         */
        readonly trace?: boolean

        /**
         * Allow multiple mysql statements per query. Be careful with this, it could increase the scope of SQL injection attacks.
         * (Default: false)
         */
        readonly multipleStatements?: boolean

        /**
         * List of connection flags to use other than the default ones. It is also possible to blacklist default ones.
         * For more information, check https://github.com/mysqljs/mysql#connection-flags.
         */
        readonly flags?: string[]
    }
}
