/**
 * PlanetScale specific connection credential options.
 *
 * @see https://github.com/planetscale/database-js
 */
export interface PlanetScaleConnectionCredentialsOptions {
    /**
     * The url is an optional parameter that should contain
     * host, username, password and the database name.
     * It can be used instead of setting each of those fields separately.
     */
    readonly url?: string

    /**
     * Database host.
     */
    readonly host?: string

    /**
     * Database username.
     */
    readonly username?: string

    /**
     * Database password.
     */
    readonly password?: string

    /**
     * Database name to connect to.
     */
    readonly database?: string
}
