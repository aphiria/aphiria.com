/**
 * Preview PR Stack (Per-PR isolated environments)
 */

import { createStack } from "./lib/stack-factory";
import { createPreviewPRProvider } from "./lib/preview-pr-provider";

const stack = createStack("preview", createPreviewPRProvider());

// Export the PR URLs for GitHub Actions to post as PR comment
export const webUrl = stack.config.app!.web.url;
export const apiUrl = stack.config.app!.api.url;
