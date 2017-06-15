var tools = {
    readVint: function(buffer, start) {
        start = start || 0;
        for (var length = 1; length < 8; length++) {//todo max length must be determined from the EBML header dtd file (8 - is default EBMLMaxIDLength so instead 8 there must be EBMLMaxIDLength)
            if (buffer[start] >= Math.pow(2, 8 - length)) {//todo instead 8 should be EBMLMaxIDLength
                break;
            }
        }
        if (length > 8) {//todo EBMLMaxIDLength instead 8
            throw new Error("Unrepresentable length: " + length + " " + //todo if length of tag ID defined in dtd file by tag EBMLMaxIDLength, so length may be more than 8
                buffer.toString('hex', start, start + length));
        }
        if (start + length > buffer.length) {
            return null;
        }
        var value = buffer[start] & (1 << (8 - length)) - 1;//todo EBMLMaxIDLength instead 8
        for (i = 1; i < length; i++) {//todo
            if (i === 7) {
                if (value >= Math.pow(2, 53 - 8) && buffer[start + 7] > 0) {
                    return {
                        length: length,
                        value: -1
                    };
                }
            }
            value *= Math.pow(2, 8);
            value += buffer[start + i];
        }
        return {
            length: length,
            value: value
        };
    },

    writeVint: function(value) {
        if (value < 0 || value > Math.pow(2, 53)) {
            throw new Error("Unrepresentable value: " + value);
        }
        for (var length = 1; length <= 8; length++) {
            if (value < Math.pow(2, 7 * length) - 1) {
                break;
            }
        }
        var buffer = new Buffer(length);
        for (i = 1; i <= length; i++) {
            var b = value & 0xFF;
            buffer[length - i] = b;
            value -= b;
            value /= Math.pow(2, 8);
        }
        buffer[0] = buffer[0] | (1 << (8 - length));
        return buffer;
    }
};

module.exports = tools;
