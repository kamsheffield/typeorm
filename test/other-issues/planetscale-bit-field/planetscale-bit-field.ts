import { assert } from "chai"
import { DataSource, Raw } from "../../../src"
import {
    closeTestingConnections,
    createTestingConnections,
} from "../../utils/test-utils"
import { BitFieldTestEntity } from "./entity/BitFieldTestEntity"

describe("planetscale bitfield support", () => {
    let connections: DataSource[]

    beforeEach(async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["planetscale"],
            entities: [__dirname + "/entity/BitFieldTestEntity{.js,.ts}"],
        })
        await Promise.all(
            connections.map(async (connection) => {
                await connection.synchronize(true)
                await connection.close()
            }),
        )
    })

    afterEach(async () => {
        await closeTestingConnections(connections)
    })

    it("should insert and read column", async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["planetscale"],
            entities: [__dirname + "/entity/BitFieldTestEntity{.js,.ts}"],
        })
        await Promise.all(
            connections.map(async (connection) => {
                //const bitField = 2166433824
                const bitField = 4294967295
                //const bitField = 8589934591
                // insert a new record into the table
                const repo = connection.getRepository(BitFieldTestEntity)
                let entity = repo.create({ title: "test", bitField: bitField })
                entity = await repo.save(entity)

                // read the record back
                const result = await repo.findOneBy({
                    id: entity.id,
                })

                // verify the bitfield is read out with the same value
                result?.bitField.should.be.a("number")
                result?.bitField.should.be.eql(bitField)
                result?.bitField.should.be.eql(entity.bitField)
            }),
        )
    })

    it("should select by bitfield", async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["planetscale"],
            entities: [__dirname + "/entity/BitFieldTestEntity{.js,.ts}"],
        })
        await Promise.all(
            connections.map(async (connection) => {
                const bitField = 2166433824

                // insert a new record into the table
                const repo = connection.getRepository(BitFieldTestEntity)
                let entity = repo.create({ title: "test", bitField: bitField })
                entity = await repo.save(entity)

                // read the record back
                const result = await repo.findOneBy({
                    bitField: bitField,
                })

                // verify the bitfield is read out with the same value
                result?.bitField.should.be.a("number")
                result?.bitField.should.be.eql(bitField)
                result?.bitField.should.be.eql(entity.bitField)
            }),
        )
    })

    it("should support bitwise & bitfield filtering", async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["planetscale"],
            entities: [__dirname + "/entity/BitFieldTestEntity{.js,.ts}"],
        })
        await Promise.all(
            connections.map(async (connection) => {
                const bitField = 2166433824

                // insert a new record into the table
                const repo = connection.getRepository(BitFieldTestEntity)
                let entity = repo.create({ title: "test", bitField: bitField })
                entity = await repo.save(entity)

                // read the record back
                const result = await repo.findOneBy({
                    bitField: Raw(
                        (columnAlias) =>
                            `(${columnAlias} & ${310514304}) = ${bitField}`,
                    ),
                })
                assert.isNull(result)

                // read the record back
                const result2 = await repo.findOneBy({
                    bitField: Raw(
                        (columnAlias) =>
                            `(${columnAlias} & ${2309302438}) = ${bitField}`,
                    ),
                })
                assert.isNotNull(result2)

                // verify the bitfield is read out with the same value
                result2?.bitField.should.be.a("number")
                result2?.bitField.should.be.eql(bitField)
                result2?.bitField.should.be.eql(entity.bitField)
            }),
        )
    })

    it("should support bitwise | bitfield filtering", async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["planetscale"],
            entities: [__dirname + "/entity/BitFieldTestEntity{.js,.ts}"],
        })
        await Promise.all(
            connections.map(async (connection) => {
                const bitField = 0b11001100110011001100
                //    = 0b10101010101010101010
                //    = 0b11101110111011101110
                // insert a new record into the table
                const repo = connection.getRepository(BitFieldTestEntity)
                let entity = repo.create({ title: "test", bitField: bitField })
                entity = await repo.save(entity)

                // read the record back
                const result = await repo.findOneBy({
                    bitField: Raw(
                        (columnAlias) =>
                            `(${columnAlias} | ${0b10101010101010101010}) = ${bitField}`,
                    ),
                })
                assert.isNull(result)

                // read the record back
                const result2 = await repo.findOneBy({
                    bitField: Raw(
                        (columnAlias) =>
                            `(${columnAlias} | ${0b10101010101010101010}) = ${0b11101110111011101110}`,
                    ),
                })
                assert.isNotNull(result2)

                // verify the bitfield is read out with the same value
                result2?.bitField.should.be.a("number")
                result2?.bitField.should.be.eql(bitField)
                result2?.bitField.should.be.eql(entity.bitField)
            }),
        )
    })
})
