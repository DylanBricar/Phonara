export const formatDateTime = (timestamp: string, locale: string): string => {
  try {
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const date = new Date(timestampMs);

    if (isNaN(date.getTime())) {
      return timestamp;
    }

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return timestamp;
  }
};
