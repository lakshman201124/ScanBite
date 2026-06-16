export function apiTimer(routeName: string) {
  const start = performance.now();

  return {
    end(status: number) {
      const duration = Math.round(performance.now() - start);

      // Log slow requests
      if (duration > 500) {
        console.warn(
          `[SLOW API] ${routeName} took ${duration}ms (status: ${status})`
        );
      }

      // Structured log for aggregation
      console.log(JSON.stringify({
        type: 'api_request',
        route: routeName,
        duration_ms: duration,
        status,
        timestamp: new Date().toISOString(),
      }));
    },
  };
}
