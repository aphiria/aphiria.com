import * as pulumi from "@pulumi/pulumi";
import * as crypto from "crypto";

/**
 * Calculate SHA256 checksum of data for pod template annotation.
 * This forces pod restarts when ConfigMap or Secret data changes.
 *
 * Pattern: Helm-standard checksum annotation pattern
 * Usage: Add to pod template annotations as "checksum/config": checksum(configData)
 *        or "checksum/secret": checksum(secretData)
 *
 * @param data Data object (key-value pairs from ConfigMap or Secret)
 * @returns SHA256 hex digest (deterministic hash of sorted keys)
 *
 * @example
 * const configData = {
 *     DB_HOST: "localhost",
 *     DB_PORT: "5432",
 *     APP_ENV: "preview",
 * };
 * const secretData = {
 *     DB_PASSWORD: pulumi.secret("password123"),
 * };
 * const configChecksum = checksum(configData);  // "a1b2c3d4..."
 * const secretChecksum = checksum(secretData);  // "e5f6g7h8..."
 *
 * // Use in pod template:
 * metadata: {
 *     annotations: {
 *         "checksum/config": configChecksum,
 *         "checksum/secret": secretChecksum,
 *     },
 * }
 */
export function checksum(data: Record<string, pulumi.Input<string>>): string {
    // Sort keys for deterministic hashing (object key order is not guaranteed)
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash("sha256").update(serialized).digest("hex");
}
