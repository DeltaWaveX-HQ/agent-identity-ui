"use client";

import React, { useEffect } from "react";
import { LANDING_CSS, LANDING_FONTS, LANDING_HTML, initLanding } from "./landing/content";

interface LandingPageProps {
  onTryNow: () => void;
}

export default function LandingPage({ onTryNow }: LandingPageProps) {
  useEffect(() => {
    const fonts = document.createElement("link");
    fonts.rel = "stylesheet";
    fonts.href = LANDING_FONTS;
    document.head.appendChild(fonts);
    const cleanup = initLanding(onTryNow);
    return () => {
      cleanup();
      fonts.remove();
      document.documentElement.removeAttribute("data-theme");
    };
  }, [onTryNow]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </>
  );
}
