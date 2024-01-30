export namespace NumberUtils {
    /**
     * Converts a bit field that is represented as a string to a number.
     *
     * @param bit
     * @returns
     */
    export function numberFromBitString(bit: any): number {
        let value = 0
        const stringVal = bit.toString()
        // each character in the string represents a byte.
        // loop through each character and get the byte value.
        // then shift the value to the left by 8 bits for each byte.
        // and add it to the total value.
        // We don't use the left shift operator because it overflows at 24 bits.
        for (let i = 0; i < stringVal.length; i++) {
            const code = stringVal.charCodeAt(i) & 255 // x00-xFFFF
            value += code * Math.pow(2, 8 * (stringVal.length - 1 - i))
        }
        return value
    }
}
