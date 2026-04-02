export function captureError(error: unknown, context?: Record<string, unknown>) {
  try {
    // Optional dependency: install @sentry/nextjs to activate.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const sentry = require("@sentry/nextjs");
    if (context) {
      sentry.withScope((scope: { setExtras: (v: Record<string, unknown>) => void }) => {
        scope.setExtras(context);
        sentry.captureException(error);
      });
    } else {
      sentry.captureException(error);
    }
  } catch {
    // Sentry package not installed or not configured yet.
  }
}
