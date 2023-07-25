import { DataSource } from "../data-source/DataSource";

/**
 * CommmandDataSource is a singleton class that holds the DataSource instance,
 * which allows consumers to pass an instance of a DataSource into the CLI commands.
 */
export class CommandDataSource {

    /**
     * Returns the DataSource instance.
     */
    public static get instance(): DataSource {
        if (!CommandDataSource._instance) {
            throw new Error("DataSource not initialized!");
        }
        return CommandDataSource._instance;
    }

    /**
     * Sets the DataSource instance.
     */
    public static set instance(dataSource: DataSource) {
        if (CommandDataSource._instance) {
            throw new Error("DataSource already initialized! Only one datasource can be used per command session.");
        }
        CommandDataSource._instance = dataSource;
    }

    // instance of the DataSource.
    private static _instance: DataSource;
}
