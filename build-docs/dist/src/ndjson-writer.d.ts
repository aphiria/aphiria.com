import { LexemeRecord } from "./types";
/**
 * Write lexeme records to NDJSON file
 */
export declare class NdjsonWriter {
    private stream;
    /**
     * Open NDJSON file for writing
     */
    open(filePath: string): void;
    /**
     * Write lexeme record to NDJSON file
     */
    write(record: LexemeRecord): void;
    /**
     * Write multiple lexeme records to NDJSON file
     */
    writeAll(records: LexemeRecord[]): void;
    /**
     * Close NDJSON file
     */
    close(): Promise<void>;
}
/**
 * Write lexeme records to NDJSON file (convenience function)
 */
export declare function writeLexemesToNdjson(records: LexemeRecord[], filePath: string): Promise<void>;
//# sourceMappingURL=ndjson-writer.d.ts.map