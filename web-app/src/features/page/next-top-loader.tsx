import * as NProgress from "nprogress";
import * as React from "react";
import { create } from "zustand";

type NextTopLoaderProps = {
  initialPosition?: number;
  crawlSpeed?: number;
  crawl?: boolean;
  showSpinner?: boolean;
  easing?: string;
  speed?: number;
  delay?: number;
};

const isAnchorOfCurrentUrl = (currentUrl: string, newUrl: string) => {
  const currentUrlObj = new URL(currentUrl);
  const newUrlObj = new URL(newUrl);
  const currentHash = currentUrlObj.hash;
  const newHash = newUrlObj.hash;

  return (
    currentUrlObj.hostname === newUrlObj.hostname &&
    currentUrlObj.pathname === newUrlObj.pathname &&
    currentUrlObj.search === newUrlObj.search &&
    currentHash !== newHash &&
    currentUrlObj.href.replace(currentHash, "") ===
      newUrlObj.href.replace(newHash, "")
  );
};

export const useNextTopLoaderStore = create<{
  isEnable: boolean;
  disable: () => void;
  enable: () => void;
  stop: () => void;
}>((set) => ({
  isEnable: true,
  disable: () => set({ isEnable: false }),
  enable: () => set({ isEnable: true }),
  stop: () => {
    NProgress.done();
    for (const el of document.querySelectorAll("html")) {
      el.classList.remove("nprogress-busy");
    }
  },
}));

export const NextTopLoader = ({
  showSpinner = false,
  crawl = true,
  crawlSpeed = 200,
  initialPosition = 0.08,
  easing = "ease",
  speed = 200,
  delay = 0,
}: NextTopLoaderProps) => {
  React.useEffect(() => {
    NProgress.configure({
      showSpinner,
      trickle: crawl,
      trickleSpeed: crawlSpeed,
      minimum: initialPosition,
      easing,
      speed,
    });

    const handleNProgressStart = () => {
      let isDone = false;
      setTimeout(() => {
        if (!isDone) {
          NProgress.start();
        }
      }, 100);

      const originalPushState = window.history.pushState;
      window.history.pushState = function (...args) {
        isDone = true;
        NProgress.done();
        for (const el of document.querySelectorAll("html")) {
          el.classList.remove("nprogress-busy");
        }
        return originalPushState.apply(window.history, args);
      };
    };

    const handleQuickProgress = () => {
      if (delay === 0) {
        NProgress.start();
        NProgress.done();
        for (const el of document.querySelectorAll("html")) {
          el.classList.remove("nprogress-busy");
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (useNextTopLoaderStore.getState().isEnable === false) return;
      if (event.ctrlKey || event.metaKey) return;

      try {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");

        if (!anchor) return;

        const currentUrl = window.location.href;
        const newUrl = anchor.href;
        const isExternalLink = anchor.target === "_blank";
        const isAnchor = isAnchorOfCurrentUrl(currentUrl, newUrl);
        const isDisabled = anchor.getAttribute("data-toploader-disabled");

        if (isDisabled === "true") return;

        if (newUrl === currentUrl || isAnchor || isExternalLink) {
          handleQuickProgress();
        } else {
          handleNProgressStart();
        }
      } catch {
        handleQuickProgress();
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
