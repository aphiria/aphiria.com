import * as pulumi from "@pulumi/pulumi";
import * as crypto from "crypto";

/**
 * Calculate SHA256 checksum of ConfigMap data for pod template annotation.
 * This forces pod restarts when ConfigMap data changes.
 *
 * Pattern: Helm-standard checksum annotation pattern
 * Usage: Add to pod template annotations as "checksum/config": configMapChecksum(data)
 *
 * @param data ConfigMap data object (key-value pairs)
 * @returns SHA256 hex digest (deterministic hash of sorted keys)
 *
 * @example
 * const configData = {
 *     DB_HOST: "localhost",
 *     DB_PORT: "5432",
 *     APP_ENV: "preview",
 * };
 * const checksum = configMapChecksum(configData); // "a1b2c3d4..."
 *
 * // Use in pod template:
 * metadata: {
 *     annotations: {
 *         "checksum/config": checksum,
 *     },
 * }
 */
export function configMapChecksum(data: Record<string, pulumi.Input<string>>): string {
    // Sort keys for deterministic hashing (object key order is not guaranteed)
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash("sha256").update(serialized).digest("hex");
}
