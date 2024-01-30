import { Column } from "../../../../src/decorator/columns/Column"
import { PrimaryGeneratedColumn } from "../../../../src/decorator/columns/PrimaryGeneratedColumn"
import { Entity } from "../../../../src/decorator/entity/Entity"

@Entity()
export class BitFieldTestEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column("bit", { precision: 32 })
    bitField: number
}
