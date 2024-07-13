import { ObjectLiteral } from "../../common/ObjectLiteral"
import { DataSource } from "../../data-source/DataSource"
import { TypeORMError } from "../../error"
import { ColumnMetadata } from "../../metadata/ColumnMetadata"
import { EntityMetadata } from "../../metadata/EntityMetadata"
import { QueryRunner } from "../../query-runner/QueryRunner"
import { RdbmsSchemaBuilder } from "../../schema-builder/RdbmsSchemaBuilder"
import { SchemaBuilder } from "../../schema-builder/SchemaBuilder"
import { Table } from "../../schema-builder/table/Table"
import { TableColumn } from "../../schema-builder/table/TableColumn"
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey"
import { View } from "../../schema-builder/view/View"
import { ApplyValueTransformers } from "../../util/ApplyValueTransformers"
import { DateUtils } from "../../util/DateUtils"
import { InstanceChecker } from "../../util/InstanceChecker"
import { NumberUtils } from "../../util/NumberUtils"
import { OrmUtils } from "../../util/OrmUtils"
import { Driver, ReturningType } from "../Driver"
import { DriverUtils } from "../DriverUtils"
import { ColumnType } from "../types/ColumnTypes"
import { CteCapabilities } from "../types/CteCapabilities"
import { DataTypeDefaults } from "../types/DataTypeDefaults"
import { MappedColumnTypes } from "../types/MappedColumnTypes"
import { ReplicationMode } from "../types/ReplicationMode"
import { UpsertType } from "../types/UpsertType"
import { PlanetScaleDataSourceOptions } from "./PlanetScaleDataSourceOptions"
import { PlanetScaleQueryRunner } from "./PlanetScaleQueryRunner"

/**
 * Organizes communication with PlanetScale database via the serverless driver.
 */
export abstract class PlanetScaleDriver implements Driver {
    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection type used by driver.
     */
    type: "serverless" | "mysql"

    /**
     * DataSource used by driver.
     */
    dataSource: DataSource

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Connection options.
     */
    options: PlanetScaleDataSourceOptions

    /**
     * Version of the database PlanetScale returns, likely a version of MySQL.
     * Requires a SQL query to the DB, so it is not always set.
     */
    version?: string

    /**
     * Master database used to perform all write queries.
     */
    database?: string

    /**
     * Indicates if replication is enabled.
     * Setting this has no effect for this driver type.
     */
    isReplicated: boolean = false

    /**
     * Indicates if tree tables are supported by this driver.
     */
    treeSupport = true

    /**
     * Represent transaction support by this driver
     */
    transactionSupport = "simple" as const

    /**
     * Gets list of supported column data types by a driver. We use MySQL column types here.
     *
     * @see https://www.tutorialspoint.com/mysql/mysql-data-types.htm
     * @see https://dev.mysql.com/doc/refman/8.0/en/data-types.html
     */
    supportedDataTypes: ColumnType[] = [
        // numeric types
        "bit",
        "int",
        "integer", // synonym for int
        "tinyint",
        "smallint",
        "mediumint",
        "bigint",
        "float",
        "double",
        "double precision", // synonym for double
        "real", // synonym for double
        "decimal",
        "dec", // synonym for decimal
        "numeric", // synonym for decimal
        "fixed", // synonym for decimal
        "bool", // synonym for tinyint
        "boolean", // synonym for tinyint
        // date and time types
        "date",
        "datetime",
        "timestamp",
        "time",
        "year",
        // string types
        "char",
        "nchar", // synonym for national char
        "national char",
        "varchar",
        "nvarchar", // synonym for national varchar
        "national varchar",
        "blob",
        "text",
        "tinyblob",
        "tinytext",
        "mediumblob",
        "mediumtext",
        "longblob",
        "longtext",
        "enum",
        "set",
        "binary",
        "varbinary",
        // json data type
        "json",
        // spatial data types
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection",
    ]

    /**
     * Returns type of upsert supported by driver if any.
     */
    supportedUpsertTypes: UpsertType[] = []

    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[] = [
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection",
    ]

    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[] = [
        "char",
        "varchar",
        "nvarchar",
        "binary",
        "varbinary",
    ]

    /**
     * Gets list of column data types that support length by a driver.
     */
    withWidthColumnTypes: ColumnType[] = [
        //"bit",
        "tinyint",
        "smallint",
        "mediumint",
        "int",
        "integer",
        "bigint",
    ]

    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[] = [
        "bit",
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real",
        "time",
        "datetime",
        "timestamp",
    ]

    /**
     * Gets list of column data types that supports scale by a driver.
     */
    withScaleColumnTypes: ColumnType[] = [
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real",
    ]

    /**
     * Gets list of column data types that supports UNSIGNED and ZEROFILL attributes.
     */
    unsignedAndZerofillTypes: ColumnType[] = [
        "int",
        "integer",
        "smallint",
        "tinyint",
        "mediumint",
        "bigint",
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real",
    ]

    /**
     * ORM has special columns and we need to know what database column types should be for those columns.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes = {
        createDate: "datetime",
        createDatePrecision: 6,
        createDateDefault: "CURRENT_TIMESTAMP(6)",
        updateDate: "datetime",
        updateDatePrecision: 6,
        updateDateDefault: "CURRENT_TIMESTAMP(6)",
        deleteDate: "datetime",
        deleteDatePrecision: 6,
        deleteDateNullable: true,
        version: "int",
        treeLevel: "int",
        migrationId: "int",
        migrationName: "varchar",
        migrationTimestamp: "bigint",
        cacheId: "int",
        cacheIdentifier: "varchar",
        cacheTime: "bigint",
        cacheDuration: "int",
        cacheQuery: "text",
        cacheResult: "text",
        metadataType: "varchar",
        metadataDatabase: "varchar",
        metadataSchema: "varchar",
        metadataTable: "varchar",
        metadataName: "varchar",
        metadataValue: "text",
    }

    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults = {
        varchar: { length: 255 },
        nvarchar: { length: 255 },
        "national varchar": { length: 255 },
        char: { length: 1 },
        binary: { length: 1 },
        varbinary: { length: 255 },
        decimal: { precision: 10, scale: 0 },
        dec: { precision: 10, scale: 0 },
        numeric: { precision: 10, scale: 0 },
        fixed: { precision: 10, scale: 0 },
        float: { precision: 12 },
        double: { precision: 22 },
        time: { precision: 0 },
        datetime: { precision: 0 },
        timestamp: { precision: 0 },
        bit: { width: 1, precision: 1 },
        int: { width: 11 },
        integer: { width: 11 },
        tinyint: { width: 4 },
        smallint: { width: 6 },
        mediumint: { width: 9 },
        bigint: { width: 20 },
    }

    /**
     * Max length allowed by PlanetScale/MySQL for aliases.
     * @see https://dev.mysql.com/doc/refman/5.5/en/identifiers.html
     */
    maxAliasLength = 63

    cteCapabilities: CteCapabilities = {
        enabled: false,
        requiresRecursiveHint: true,
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource
        this.options =
            dataSource.options as unknown as PlanetScaleDataSourceOptions
        this.database = DriverUtils.buildDriverOptions(this.options).database
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Performs connection to the database.
     */
    async connect(): Promise<void> {
        if (!this.database) {
            console.warn("No database specified before call to connect()")
            const queryRunner = this.createQueryRunner("master")
            this.database = await queryRunner.getCurrentDatabase()
            await queryRunner.release()
        }
    }

    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void> {
        return Promise.resolve()
    }

    /**
     * Closes connection with the database.
     */
    async disconnect(): Promise<void> {}

    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder(): SchemaBuilder {
        return new RdbmsSchemaBuilder(this.dataSource)
    }

    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner {
        return new PlanetScaleQueryRunner(this, mode)
    }

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(
        sql: string,
        parameters: ObjectLiteral,
        nativeParameters: ObjectLiteral,
    ): [string, any[]] {
        const escapedParameters: any[] = Object.keys(nativeParameters).map(
            (key) => nativeParameters[key],
        )
        if (!parameters || !Object.keys(parameters).length)
            return [sql, escapedParameters]

        sql = sql.replace(
            /:(\.\.\.)?([A-Za-z0-9_.]+)/g,
            (full, isArray: string, key: string): string => {
                if (!parameters.hasOwnProperty(key)) {
                    return full
                }

                let value: any = parameters[key]

                if (isArray) {
                    return value
                        .map((v: any) => {
                            escapedParameters.push(v)
                            return this.createParameter(
                                key,
                                escapedParameters.length - 1,
                            )
                        })
                        .join(", ")
                }

                if (typeof value === "function") {
                    return value()
                }

                escapedParameters.push(value)
                return this.createParameter(key, escapedParameters.length - 1)
            },
        ) // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters]
    }

    /**
     * Escapes a column name.
     */
    escape(columnName: string): string {
        return "`" + columnName + "`"
    }

    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    buildTableName(
        tableName: string,
        schema?: string,
        database?: string,
    ): string {
        let tablePath = [tableName]

        if (database) {
            tablePath.unshift(database)
        }

        return tablePath.join(".")
    }

    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    parseTableName(
        target: EntityMetadata | Table | View | TableForeignKey | string,
    ): { database?: string; schema?: string; tableName: string } {
        const driverDatabase = this.database
        const driverSchema = undefined

        if (InstanceChecker.isTable(target) || InstanceChecker.isView(target)) {
            const parsed = this.parseTableName(target.name)

            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName,
            }
        }

        if (InstanceChecker.isTableForeignKey(target)) {
            const parsed = this.parseTableName(target.referencedTableName)

            return {
                database:
                    target.referencedDatabase ||
                    parsed.database ||
                    driverDatabase,
                schema:
                    target.referencedSchema || parsed.schema || driverSchema,
                tableName: parsed.tableName,
            }
        }

        if (InstanceChecker.isEntityMetadata(target)) {
            // EntityMetadata tableName is never a path

            return {
                database: target.database || driverDatabase,
                schema: target.schema || driverSchema,
                tableName: target.tableName,
            }
        }

        const parts = target.split(".")

        return {
            database:
                (parts.length > 1 ? parts[0] : undefined) || driverDatabase,
            schema: driverSchema,
            tableName: parts.length > 1 ? parts[1] : parts[0],
        }
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformTo(
                columnMetadata.transformer,
                value,
            )

        if (value === null || value === undefined) return value

        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0
        } else if (columnMetadata.type === "date") {
            return DateUtils.mixedDateToDateString(value)
        } else if (columnMetadata.type === "time") {
            return DateUtils.mixedDateToTimeString(value)
        } else if (columnMetadata.type === "json") {
            return JSON.stringify(value)
        } else if (
            columnMetadata.type === "timestamp" ||
            columnMetadata.type === "datetime" ||
            columnMetadata.type === Date
        ) {
            return DateUtils.mixedDateToDate(value)
        } else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value)
        } else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value)
        } else if (
            columnMetadata.type === "enum" ||
            columnMetadata.type === "simple-enum"
        ) {
            return "" + value
        } else if (columnMetadata.type === "set") {
            return DateUtils.simpleArrayToString(value)
        } else if (columnMetadata.type === Number) {
            // convert to number if number
            value = !isNaN(+value) ? parseInt(value) : value
        }

        return value
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any {
        if (value === null || value === undefined) {
            return columnMetadata.transformer
                ? ApplyValueTransformers.transformFrom(
                      columnMetadata.transformer,
                      value,
                  )
                : value
        }

        if (
            columnMetadata.type === Boolean ||
            columnMetadata.type === "bool" ||
            columnMetadata.type === "boolean"
        ) {
            value = value ? true : false
        } else if (
            columnMetadata.type === "datetime" ||
            columnMetadata.type === Date
        ) {
            // PlanetScale driver calls toISOString() on Date objects
            // and then strips of the Z before sending it to PlanetScale.
            // Put the Z back in here so that the date is interpreted correctly.
            if (typeof value === "string") {
                value = value + "Z"
            }
            value = DateUtils.normalizeHydratedDate(value)
        } else if (columnMetadata.type === "date") {
            value = DateUtils.mixedDateToDateString(value)
        } else if (columnMetadata.type === "json") {
            value = typeof value === "string" ? JSON.parse(value) : value
        } else if (columnMetadata.type === "time") {
            value = DateUtils.mixedTimeToString(value)
        } else if (columnMetadata.type === "simple-array") {
            value = DateUtils.stringToSimpleArray(value)
        } else if (columnMetadata.type === "simple-json") {
            value = DateUtils.stringToSimpleJson(value)
        } else if (
            (columnMetadata.type === "enum" ||
                columnMetadata.type === "simple-enum") &&
            columnMetadata.enum &&
            !isNaN(value) &&
            columnMetadata.enum.indexOf(parseInt(value)) >= 0
        ) {
            // convert to number if that exists in possible enum options
            value = parseInt(value)
        } else if (columnMetadata.type === "set") {
            value = DateUtils.stringToSimpleArray(value)
        } else if (columnMetadata.type === Number) {
            // convert to number if number
            value = !isNaN(+value) ? parseInt(value) : value
        } else if (columnMetadata.type === "bit") {
            let bitValue = NumberUtils.numberFromBitString(value)
            value = bitValue
        }

        if (columnMetadata.transformer) {
            value = ApplyValueTransformers.transformFrom(
                columnMetadata.transformer,
                value,
            )
        }

        return value
    }

    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: {
        type: ColumnType
        length?: number | string
        precision?: number | null
        scale?: number
    }): string {
        if (column.type === Number || column.type === "integer") {
            return "int"
        } else if (column.type === String) {
            return "varchar"
        } else if (column.type === Date) {
            return "datetime"
        } else if ((column.type as any) === Buffer) {
            return "blob"
        } else if (column.type === Boolean) {
            return "tinyint"
        } else if (column.type === "uuid") {
            return "varchar"
        } else if (
            column.type === "simple-array" ||
            column.type === "simple-json"
        ) {
            return "text"
        } else if (column.type === "simple-enum") {
            return "enum"
        } else if (
            column.type === "double precision" ||
            column.type === "real"
        ) {
            return "double"
        } else if (
            column.type === "dec" ||
            column.type === "numeric" ||
            column.type === "fixed"
        ) {
            return "decimal"
        } else if (column.type === "bool" || column.type === "boolean") {
            return "tinyint"
        } else if (
            column.type === "nvarchar" ||
            column.type === "national varchar"
        ) {
            return "varchar"
        } else if (column.type === "nchar" || column.type === "national char") {
            return "char"
        } else {
            return (column.type as string) || ""
        }
    }

    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string | undefined {
        const defaultValue = columnMetadata.default

        if (defaultValue === null) {
            return undefined
        }

        if (
            (columnMetadata.type === "enum" ||
                columnMetadata.type === "simple-enum" ||
                typeof defaultValue === "string") &&
            defaultValue !== undefined
        ) {
            return `'${defaultValue}'`
        }

        if (columnMetadata.type === "set" && defaultValue !== undefined) {
            return `'${DateUtils.simpleArrayToString(defaultValue)}'`
        }

        if (typeof defaultValue === "number") {
            return `'${defaultValue.toFixed(columnMetadata.scale)}'`
        }

        if (typeof defaultValue === "boolean") {
            return defaultValue ? "1" : "0"
        }

        if (typeof defaultValue === "function") {
            const value = defaultValue()
            return this.normalizeDatetimeFunction(value)
        }

        if (defaultValue === undefined) {
            return undefined
        }

        return `${defaultValue}`
    }

    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column: ColumnMetadata): boolean {
        return column.entityMetadata.indices.some(
            (idx) =>
                idx.isUnique &&
                idx.columns.length === 1 &&
                idx.columns[0] === column,
        )
    }

    /**
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column: ColumnMetadata | TableColumn): string {
        if (column.length) return column.length.toString()

        /**
         * fix https://github.com/typeorm/typeorm/issues/1139
         */
        if (column.generationStrategy === "uuid") return "36"

        switch (column.type) {
            case String:
            case "varchar":
            case "nvarchar":
            case "national varchar":
                return "255"
            case "varbinary":
                return "255"
            default:
                return ""
        }
    }

    /**
     * Creates column type definition including length, precision and scale
     */
    createFullType(column: TableColumn): string {
        let type = column.type

        // used 'getColumnLength()' method, because MySQL requires column length for `varchar`, `nvarchar` and `varbinary` data types
        if (this.getColumnLength(column)) {
            type += `(${this.getColumnLength(column)})`
        } else if (column.width) {
            type += `(${column.width})`
        } else if (
            column.precision !== null &&
            column.precision !== undefined &&
            column.scale !== null &&
            column.scale !== undefined
        ) {
            type += `(${column.precision},${column.scale})`
        } else if (
            column.precision !== null &&
            column.precision !== undefined
        ) {
            type += `(${column.precision})`
        }

        if (column.isArray) type += " array"

        return type
    }

    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<any> {
        throw new TypeORMError(
            "PlanetScale does not support replication. Call connect() instead.",
        )
    }

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any> {
        throw new TypeORMError(
            "PlanetScale does not support replication. Call connect() instead.",
        )
    }

    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(
        metadata: EntityMetadata,
        insertResult: any,
        entityIndex: number,
    ) {
        if (!insertResult) {
            return undefined
        }

        if (insertResult.insertId === undefined) {
            return Object.keys(insertResult).reduce((map, key) => {
                const column = metadata.findColumnWithDatabaseName(key)
                if (column) {
                    OrmUtils.mergeDeep(
                        map,
                        column.createValueMap(insertResult[key]),
                    )
                    // OrmUtils.mergeDeep(map, column.createValueMap(this.prepareHydratedValue(insertResult[key], column))); // TODO: probably should be like there, but fails on enums, fix later
                }
                return map
            }, {} as ObjectLiteral)
        }

        const generatedMap = metadata.generatedColumns.reduce(
            (map, generatedColumn) => {
                let value: any
                if (
                    generatedColumn.generationStrategy === "increment" &&
                    (insertResult.insertId as number)
                ) {
                    // NOTE: When multiple rows is inserted by a single INSERT statement,
                    // `insertId` is the value generated for the first inserted row only.
                    let insertId: number = parseInt(insertResult.insertId)
                    value = insertId + entityIndex
                    // } else if (generatedColumn.generationStrategy === "uuid") {
                    //     console.log("getting db value:", generatedColumn.databaseName);
                    //     value = generatedColumn.getEntityValue(uuidMap);
                }

                return OrmUtils.mergeDeep(
                    map,
                    generatedColumn.createValueMap(value),
                )
            },
            {} as ObjectLiteral,
        )

        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined
    }

    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(
        tableColumns: TableColumn[],
        columnMetadatas: ColumnMetadata[],
    ): ColumnMetadata[] {
        return columnMetadatas.filter((columnMetadata) => {
            const tableColumn = tableColumns.find(
                (c) => c.name === columnMetadata.databaseName,
            )
            if (!tableColumn) return false // we don't need new columns, we only need exist and changed

            const isColumnChanged =
                tableColumn.name !== columnMetadata.databaseName ||
                tableColumn.type !== this.normalizeType(columnMetadata) ||
                tableColumn.length !== this.getColumnLength(columnMetadata) ||
                tableColumn.width !== columnMetadata.width ||
                (columnMetadata.precision !== undefined &&
                    tableColumn.precision !== columnMetadata.precision) ||
                (columnMetadata.scale !== undefined &&
                    tableColumn.scale !== columnMetadata.scale) ||
                tableColumn.zerofill !== columnMetadata.zerofill ||
                tableColumn.unsigned !== columnMetadata.unsigned ||
                tableColumn.asExpression !== columnMetadata.asExpression ||
                tableColumn.generatedType !== columnMetadata.generatedType ||
                tableColumn.comment !==
                    this.escapeComment(columnMetadata.comment) ||
                !this.compareDefaultValues(
                    this.normalizeDefault(columnMetadata),
                    tableColumn.default,
                ) ||
                (tableColumn.enum &&
                    columnMetadata.enum &&
                    !OrmUtils.isArraysEqual(
                        tableColumn.enum,
                        columnMetadata.enum.map((val) => val + ""),
                    )) ||
                tableColumn.onUpdate !==
                    this.normalizeDatetimeFunction(columnMetadata.onUpdate) ||
                tableColumn.isPrimary !== columnMetadata.isPrimary ||
                !this.compareNullableValues(columnMetadata, tableColumn) ||
                tableColumn.isUnique !==
                    this.normalizeIsUnique(columnMetadata) ||
                (columnMetadata.generationStrategy !== "uuid" &&
                    tableColumn.isGenerated !== columnMetadata.isGenerated)

            // DEBUG SECTION
            // if (isColumnChanged) {
            //     console.log("table:", columnMetadata.entityMetadata.tableName)
            //     console.log(
            //         "name:",
            //         tableColumn.name,
            //         columnMetadata.databaseName,
            //     )
            //     console.log(
            //         "type:",
            //         tableColumn.type,
            //         this.normalizeType(columnMetadata),
            //     )
            //     console.log(
            //         "length:",
            //         tableColumn.length,
            //         this.getColumnLength(columnMetadata),
            //     )
            //     console.log("width:", tableColumn.width, columnMetadata.width)
            //     console.log(
            //         "precision:",
            //         tableColumn.precision,
            //         columnMetadata.precision,
            //     )
            //     console.log("scale:", tableColumn.scale, columnMetadata.scale)
            //     console.log(
            //         "zerofill:",
            //         tableColumn.zerofill,
            //         columnMetadata.zerofill,
            //     )
            //     console.log(
            //         "unsigned:",
            //         tableColumn.unsigned,
            //         columnMetadata.unsigned,
            //     )
            //     console.log(
            //         "asExpression:",
            //         tableColumn.asExpression,
            //         columnMetadata.asExpression,
            //     )
            //     console.log(
            //         "generatedType:",
            //         tableColumn.generatedType,
            //         columnMetadata.generatedType,
            //     )
            //     console.log(
            //         "comment:",
            //         tableColumn.comment,
            //         this.escapeComment(columnMetadata.comment),
            //     )
            //     console.log(
            //         "default:",
            //         tableColumn.default,
            //         this.normalizeDefault(columnMetadata),
            //     )
            //     console.log("enum:", tableColumn.enum, columnMetadata.enum)
            //     console.log(
            //         "default changed:",
            //         !this.compareDefaultValues(
            //             this.normalizeDefault(columnMetadata),
            //             tableColumn.default,
            //         ),
            //     )
            //     console.log(
            //         "isPrimary:",
            //         tableColumn.isPrimary,
            //         columnMetadata.isPrimary,
            //     )
            //     console.log(
            //         "isNullable changed:",
            //         !this.compareNullableValues(columnMetadata, tableColumn),
            //     )
            //     console.log(
            //         "isUnique:",
            //         tableColumn.isUnique,
            //         this.normalizeIsUnique(columnMetadata),
            //     )
            //     console.log(
            //         "isGenerated:",
            //         tableColumn.isGenerated,
            //         columnMetadata.isGenerated,
            //     )
            //     console.log(
            //         columnMetadata.generationStrategy !== "uuid" &&
            //             tableColumn.isGenerated !== columnMetadata.isGenerated,
            //     )
            //     console.log("==========================================")
            // }

            return isColumnChanged
        })
    }

    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(returningType: ReturningType): boolean {
        return false
    }

    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported(): boolean {
        return false
    }

    /**
     * Returns true if driver supports fulltext indices.
     */
    isFullTextColumnTypeSupported(): boolean {
        return true
    }

    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string {
        return "?"
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Checks if "DEFAULT" values in the column metadata and in the database are equal.
     */
    protected compareDefaultValues(
        columnMetadataValue: string | undefined,
        databaseValue: string | undefined,
    ): boolean {
        if (
            typeof columnMetadataValue === "string" &&
            typeof databaseValue === "string"
        ) {
            // we need to cut out "'" because in mysql we can understand returned value is a string or a function
            // as result compare cannot understand if default is really changed or not
            columnMetadataValue = columnMetadataValue.replace(/^'+|'+$/g, "")
            databaseValue = databaseValue.replace(/^'+|'+$/g, "")
        }

        return columnMetadataValue === databaseValue
    }

    compareNullableValues(
        columnMetadata: ColumnMetadata,
        tableColumn: TableColumn,
    ): boolean {
        return columnMetadata.isNullable === tableColumn.isNullable
    }

    /**
     * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
     * Otherwise returns original input.
     */
    protected normalizeDatetimeFunction(value?: string) {
        if (!value) return value

        // check if input is datetime function
        const isDatetimeFunction =
            value.toUpperCase().indexOf("CURRENT_TIMESTAMP") !== -1 ||
            value.toUpperCase().indexOf("NOW") !== -1

        if (isDatetimeFunction) {
            // extract precision, e.g. "(3)"
            const precision = value.match(/\(\d+\)/)
            return precision
                ? `CURRENT_TIMESTAMP${precision[0]}`
                : "CURRENT_TIMESTAMP"
        } else {
            return value
        }
    }

    /**
     * Escapes a given comment.
     */
    protected escapeComment(comment?: string) {
        if (!comment) return comment

        comment = comment.replace(/\u0000/g, "") // Null bytes aren't allowed in comments

        return comment
    }
}