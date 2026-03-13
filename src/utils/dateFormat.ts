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

export const formatDate = (timestamp: string, locale: string): string => {
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
    }).format(date);
  } catch {
    return timestamp;
  }
};

export const formatRelativeTime = (
  timestamp: string,
  locale: string,
): string => {
  try {
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const date = new Date(timestampMs);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return timestamp;
    }

    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, "second");
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return rtf.format(-diffInMinutes, "minute");
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return rtf.format(-diffInHours, "hour");
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return rtf.format(-diffInDays, "day");
    }

    if (diffInDays < 30) {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return rtf.format(-diffInWeeks, "week");
    }

    if (diffInDays < 365) {
      const diffInMonths = Math.floor(diffInDays / 30);
      return rtf.format(-diffInMonths, "month");
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return rtf.format(-diffInYears, "year");
  } catch {
    return formatDateTime(timestamp, locale);
  }
};
