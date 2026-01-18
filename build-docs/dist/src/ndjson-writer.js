"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NdjsonWriter = void 0;
exports.writeLexemesToNdjson = writeLexemesToNdjson;
const fs_1 = require("fs");
const path_1 = require("path");
const fs_2 = require("fs");
/**
 * Write lexeme records to NDJSON file
 */
class NdjsonWriter {
    stream = null;
    /**
     * Open NDJSON file for writing
     */
    open(filePath) {
        // Ensure directory exists
        (0, fs_2.mkdirSync)((0, path_1.dirname)(filePath), { recursive: true });
        this.stream = (0, fs_1.createWriteStream)(filePath, { encoding: 'utf8' });
    }
    /**
     * Write lexeme record to NDJSON file
     */
    write(record) {
        if (!this.stream) {
            throw new Error('NDJSON writer not opened. Call open() first.');
        }
        this.stream.write(JSON.stringify(record) + '\n');
    }
    /**
     * Write multiple lexeme records to NDJSON file
     */
    writeAll(records) {
        records.forEach(record => this.write(record));
    }
    /**
     * Close NDJSON file
     */
    async close() {
        if (!this.stream) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.stream.end((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.NdjsonWriter = NdjsonWriter;
/**
 * Write lexeme records to NDJSON file (convenience function)
 */
async function writeLexemesToNdjson(records, filePath) {
    const writer = new NdjsonWriter();
    writer.open(filePath);
    writer.writeAll(records);
    await writer.close();
}
//# sourceMappingURL=ndjson-writer.js.map