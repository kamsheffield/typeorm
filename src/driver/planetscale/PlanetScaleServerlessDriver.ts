import { DataSource } from "../../data-source"
import { PlanetScaleDriver } from "./PlanetScaleDriver"
import { connect, Connection } from "@planetscale/database"

/**
 * PlanetScale driver using the PlanetScale serverless driver for Javascript.
 */
export class PlanetScaleServerlessDriver extends PlanetScaleDriver {

    /**
     * This driver uses the PlanetScale serverless driver for Javascript to connect to PlanetScale.
     */
    readonly type = "serverless"

    /**
     * Holds all Connection objects that are used by this driver.
     */
    private connectionPool: Array<Connection>

    constructor(dataSource: DataSource) {
        super(dataSource)
        this.connectionPool = []
    }

    /**
     * Closes connection with the database.
     */
    async disconnect(): Promise<void> {
        await super.disconnect()
        // clear the connection pool thereby closing all connections.
        this.connectionPool.length = 0
    }

    /**
     * For use by the PlanetScaleQueryRunner. Returns a new connection from the connection pool.
     *
     * @returns Connection An active connection from the connection pool.
     */
    obtainConnection(): Connection {
        let connection = this.connectionPool.pop()
        if (!connection) {
            connection = this.createConnection()
            //console.log("Created new connection")
        }
        return connection
    }

    /**
     * When finished with a connection, it should be released back into the pool.
     *
     * @param connection The connection to be released back into the connection pool.
     */
    releaseConnection(connection: Connection): void {
        this.connectionPool.push(connection)
        //console.log("Released connection: size: " + this.connectionPool.length)
    }

    /**
     * Creates a new connection to PlanetScale.
     *
     * @returns Connection
     */
    private createConnection(): Connection {
        return connect({
            url: this.options.url,
            host: this.options.host,
            username: this.options.username,
            password: this.options.password,
        })
    }
}
