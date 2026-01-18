import { NdjsonWriter, writeLexemesToNdjson } from '../src/ndjson-writer';
import { Context, LexemeRecord } from '../src/types';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('NDJSON Writer', () => {
    const testOutputPath = join(__dirname, 'test-output.ndjson');

    afterEach(() => {
        // Clean up test file
        if (existsSync(testOutputPath)) {
            unlinkSync(testOutputPath);
        }
    });

    const createTestRecord = (overrides: Partial<LexemeRecord> = {}): LexemeRecord => ({
        version: '1.x',
        context: Context.Global,
        link: '/docs/1.x/test',
        html_element_type: 'p',
        inner_text: 'Test content',
        h1_inner_text: 'Test Title',
        h2_inner_text: null,
        h3_inner_text: null,
        h4_inner_text: null,
        h5_inner_text: null,
        ...overrides,
    });

    describe('NdjsonWriter class', () => {
        it('writes single record as valid NDJSON', async () => {
            const writer = new NdjsonWriter();
            const record = createTestRecord();

            writer.open(testOutputPath);
            writer.write(record);
            await writer.close();

            const output = readFileSync(testOutputPath, 'utf8');
            const lines = output.trim().split('\n');

            expect(lines).toHaveLength(1);
            expect(JSON.parse(lines[0])).toEqual(record);
        });

        it('writes multiple records as newline-separated JSON', async () => {
            const writer = new NdjsonWriter();
            const records = [
                createTestRecord({ inner_text: 'First' }),
                createTestRecord({ inner_text: 'Second' }),
                createTestRecord({ inner_text: 'Third' }),
            ];

            writer.open(testOutputPath);
            writer.writeAll(records);
            await writer.close();

            const output = readFileSync(testOutputPath, 'utf8');
            const lines = output.trim().split('\n');

            expect(lines).toHaveLength(3);
            expect(JSON.parse(lines[0]).inner_text).toBe('First');
            expect(JSON.parse(lines[1]).inner_text).toBe('Second');
            expect(JSON.parse(lines[2]).inner_text).toBe('Third');
        });

        it('produces valid NDJSON without commas or array brackets', async () => {
            const writer = new NdjsonWriter();
            const records = [createTestRecord(), createTestRecord()];

            writer.open(testOutputPath);
            writer.writeAll(records);
            await writer.close();

            const output = readFileSync(testOutputPath, 'utf8');

            // Should NOT contain array brackets or commas between objects
            expect(output).not.toContain('[');
            expect(output).not.toContain(']');
            expect(output).not.toMatch(/}\s*,\s*{/);

            // Each line should be valid JSON
            const lines = output.trim().split('\n');
            lines.forEach(line => {
                expect(() => JSON.parse(line)).not.toThrow();
            });
        });

        it('throws error when writing before opening', () => {
            const writer = new NdjsonWriter();
            const record = createTestRecord();

            expect(() => writer.write(record)).toThrow('NDJSON writer not opened');
        });

        it('creates directory if it does not exist', async () => {
            const nestedPath = join(__dirname, 'nested', 'dir', 'test.ndjson');
            const writer = new NdjsonWriter();

            writer.open(nestedPath);
            writer.write(createTestRecord());
            await writer.close();

            expect(existsSync(nestedPath)).toBe(true);

            // Clean up
            unlinkSync(nestedPath);
        });
    });

    describe('writeLexemesToNdjson convenience function', () => {
        it('writes records to file in single call', async () => {
            const records = [
                createTestRecord({ inner_text: 'First' }),
                createTestRecord({ inner_text: 'Second' }),
            ];

            await writeLexemesToNdjson(records, testOutputPath);

            const output = readFileSync(testOutputPath, 'utf8');
            const lines = output.trim().split('\n');

            expect(lines).toHaveLength(2);
            expect(JSON.parse(lines[0]).inner_text).toBe('First');
            expect(JSON.parse(lines[1]).inner_text).toBe('Second');
        });
    });
});
