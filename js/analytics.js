/**
 * Lightweight client-side analytics that sends events to /api/event
 * (backed by Cloudflare Analytics Engine).
 *
 * Usage:
 *   Analytics.track("subscription_added", { name: "Netflix", price: 15.99 });
 *   Analytics.track("page_view");
 */
const Analytics = (() => {
  const ENDPOINT = "/api/event";

  function track(event, props) {
    if (!event) return;

    const payload = { event };
    if (props && typeof props === "object") {
      payload.props = props;
    }

    // Fire-and-forget using sendBeacon for reliability (survives page unload).
    // Falls back to fetch if sendBeacon isn't available.
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      } else {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Analytics should never break the app
    }
  }

  return { track };
})();
