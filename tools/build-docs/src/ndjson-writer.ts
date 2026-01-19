import { LexemeRecord } from "./types";
import { createWriteStream, WriteStream } from "fs";
import { dirname } from "path";
import { mkdirSync } from "fs";

/**
 * Write lexeme records to NDJSON file
 */
export class NdjsonWriter {
    private stream: WriteStream | null = null;

    /**
     * Open NDJSON file for writing
     */
    open(filePath: string): void {
        // Ensure directory exists
        mkdirSync(dirname(filePath), { recursive: true });

        this.stream = createWriteStream(filePath, { encoding: "utf8" });
    }

    /**
     * Write lexeme record to NDJSON file
     */
    write(record: LexemeRecord): void {
        if (!this.stream) {
            throw new Error("NDJSON writer not opened. Call open() first.");
        }

        this.stream.write(JSON.stringify(record) + "\n");
    }

    /**
     * Write multiple lexeme records to NDJSON file
     */
    writeAll(records: LexemeRecord[]): void {
        records.forEach((record) => this.write(record));
    }

    /**
     * Close NDJSON file
     */
    async close(): Promise<void> {
        if (!this.stream) {
            return;
        }

        return new Promise((resolve) => {
            this.stream!.end(() => {
                resolve();
            });
        });
    }
}

/**
 * Write lexeme records to NDJSON file (convenience function)
 */
export async function writeLexemesToNdjson(
    records: LexemeRecord[],
    filePath: string
): Promise<void> {
    const writer = new NdjsonWriter();
    writer.open(filePath);
    writer.writeAll(records);
    await writer.close();
}
