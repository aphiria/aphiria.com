import * as core from '@actions/core';
import { SecretDefinition } from './types';

/**
 * Validate required secrets are present.
 * Provides helpful error messages with setup instructions.
 */
export function validateSecrets(
    requiredSecrets: readonly SecretDefinition[],
    env: NodeJS.ProcessEnv
): void {
    const missing: SecretDefinition[] = [];

    for (const secret of requiredSecrets) {
        if (!env[secret.name]) {
            missing.push(secret);
        }
    }

    if (missing.length === 0) {
        core.info('✅ All required secrets are configured');
        return;
    }

    const secretNames = missing.map(s => s.name).join(', ');
    core.error(`Missing required secrets: ${secretNames}`);
    core.info('');
    core.info('Please add the following secrets to your repository:');
    core.info('Settings → Secrets and variables → Actions → New repository secret');
    core.info('');

    for (const secret of missing) {
        core.info(`  • ${secret.name}: ${secret.description}`);
        if (secret.createUrl) {
            core.info(`    Create at: ${secret.createUrl}`);
        }
        if (secret.scopes && secret.scopes.length > 0) {
            core.info(`    Scopes required: ${secret.scopes.join(', ')}`);
        }
        core.info('');
    }

    throw new Error(`Missing ${missing.length} required secret(s)`);
}
