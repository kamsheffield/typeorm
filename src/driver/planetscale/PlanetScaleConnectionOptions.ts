import { BaseDataSourceOptions } from "../../data-source/BaseDataSourceOptions"
import { PlanetScaleConnectionCredentialsOptions } from "./PlanetScaleConnectionCredentialsOptions"

/**
 * PlanetScale serverless specific connection options.
 *
 * @see https://github.com/planetscale/database-js
 */
export interface PlanetScaleConnectionOptions
    extends BaseDataSourceOptions,
        PlanetScaleConnectionCredentialsOptions {
    /**
     * Database type.
     */
    readonly type: "planetscale-serverless"

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
     * Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
     * (Default: true)
     */
    readonly legacySpatialSupport?: boolean
}
