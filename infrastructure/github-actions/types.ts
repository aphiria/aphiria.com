export interface RetryOptions {
    maxRetries: number;
    backoff?: 'linear' | 'exponential' | 'progressive';
    initialDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

export interface PollOptions<T> {
    until: (result: T) => boolean;
    maxAttempts: number;
    interval: number;
    onPoll?: (attempt: number) => void;
}

export interface SecretDefinition {
    name: string;
    description: string;
    createUrl?: string;
    scopes?: string[];
}
