const safaryTrack = (
  eventType: string,
  eventName: string,
  parameters?: Record<string, string | number>,
) => {
  try {
    if (typeof window !== "undefined") {
      const safary = (window as any).safary;

      safary.track({
        eventType,
        eventName,
        parameters,
      });
    }
  } catch (err) {
    console.error(err);
    // Fail silently
  }
};

export default safaryTrack;
