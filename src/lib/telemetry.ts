'use client';

// Lightweight observability and error logging interface.
// Can be backed by Sentry, OpenTelemetry, or Google Analytics.

export interface LogEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

const isProduction = process.env.NODE_ENV === 'production';

class TelemetryService {
  private enabled: boolean = true;

  constructor() {
    // Disable in dev environment if requested, or load config
    if (typeof window !== 'undefined') {
      const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
      const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

      if (sentryDsn) {
        console.log('[Telemetry] Sentry initialized with DSN:', sentryDsn);
      }
      if (gaMeasurementId) {
        console.log('[Telemetry] Google Analytics initialized with ID:', gaMeasurementId);
      }
    }
  }

  // Track page view
  trackPageView(url: string) {
    this.logEvent('page_view', { url });
  }

  // Track user actions
  trackAction(actionName: string, category: string, label?: string) {
    this.logEvent('user_action', { actionName, category, label });
  }

  // Log custom event
  logEvent(eventName: string, properties: Record<string, any> = {}) {
    if (!this.enabled) return;

    const event: LogEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
    };

    if (!isProduction) {
      console.log(`[Telemetry Event] ${eventName}:`, event);
    }

    // In a real production deployment, this is where you'd call Sentry.captureMessage()
    // or window.gtag('event', eventName, properties).
  }

  // Capture application errors
  captureError(error: Error | string, context: Record<string, any> = {}) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = error instanceof Error ? error.stack : '';

    console.error(`[Telemetry Error] ${errorMessage}`, {
      context,
      stack: errorStack,
    });

    // In production, send to Sentry:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: context });
    // }
  }
}

export const telemetry = new TelemetryService();
