var far = require('../far');
    var wordCounts = function(pointer, data, pointers) {
        pointer.segment[pointer.position + 4] = data;
        pointer.segment[pointer.position + 5] = data >>> 8;
        pointer.segment[pointer.position + 6] = pointers;
        pointer.segment[pointer.position + 7] = pointers >>> 8;
    };
    var intrasegment = function(pointer, blob, meta) {
        /* Non-bitshift to avoid possible sign-bit truncation. */
        var offset = (blob.position - pointer.position + 8) / 8;
        pointer.segment[pointer.position] = offset << 2;
        /* A bits for free. */
        pointer.segment[pointer.position + 1] = offset >>> 6;
        pointer.segment[pointer.position + 2] = offset >>> 14;
        pointer.segment[pointer.position + 3] = offset >>> 22;
        wordCounts(pointer, meta.dataBytes >>> 3, meta.pointersBytes >>> 3);
    };
    /* Preallocated blob includes an extra 8 bytes at its head for far pointer landing */
    var preallocated = function(pointer, blob, meta) {
        if (pointer.segment === blob.segment) {
            intrasegment(pointer, blob, layout);
        } else {
            // `offset` and `A` bits of zero by construction.
            var land = {
                segment: blob.segment,
                position: blob.position - 8
            };
            wordCounts(land, meta.dataBytes >>> 3, meta.pointersBytes >>> 3);
            far.terminal(pointer, land);
        }
    };
    var intersegment = function(arena, pointer, blob, meta) {
        var land = arena._preallocate(pointer.segment, 8);
        if (land.segment === pointer.segment) {
            // Single hop allocation success.
            far.terminal(pointer, land);
            intrasegment(land, blob, meta);
        } else {
            // Double hop fallback.
            wordCounts(land, meta.dataBytes >>> 3, meta.pointersBytes >>> 3);
            land.position -= 8;
            far.preterminal(pointer, land);
            far.terminal(land, blob);
        }
    };
    var nonpreallocated = function(arena, pointer, blob, meta) {
        if (pointer.segment === blob.segment) {
            // Local reference.
            intrasegment(pointer, blob, meta);
        } else {
            // Nonlocal reference.
            intersegment(arena, pointer, blob, meta);
        }
    };
    module.exports = {
        preallocated: preallocated,
        nonpreallocated: nonpreallocated,
        intrasegment: intrasegment,
        intersegment: intersegment,
        wordCounts: wordCounts
    };