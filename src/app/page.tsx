"use client";

import React, { useEffect, useState } from "react";
import AuthScreen, { AuthenticatedOrg, AuthenticatedUser } from "../components/AuthScreen";
import LandingPage from "../components/LandingPage";
import ConsoleShell from "../components/console/ConsoleShell";
import { SESSION_KEY, consoleApi } from "../lib/console-api";

export default function HomePage() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [org, setOrg] = useState<AuthenticatedOrg | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [ready, setReady] = useState(false);

  // Restore a saved session (per-browser convenience only).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved?.user && saved?.org && saved?.token) {
        setUser(saved.user);
        setOrg(saved.org);
        // Confirm the server still accepts this session; a 401 signs the console out.
        consoleApi.me().catch(() => undefined);
      }
    } catch {
      // ignore unreadable storage
    }
    setReady(true);
  }, []);

  // Any API call answered with 401 (expired or revoked session) returns to sign-in.
  useEffect(() => {
    const out = () => {
      clearSession();
      setShowSignIn(true);
    };
    window.addEventListener("console-signed-out", out);
    return () => window.removeEventListener("console-signed-out", out);
  }, []);

  function handleLogout() {
    consoleApi.logout();
    clearSession();
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setOrg(null);
    setShowSignIn(false);
    window.location.hash = "";
  }

  if (!ready) return null;

  if (!user || !org) {
    if (!showSignIn) return <LandingPage onTryNow={() => setShowSignIn(true)} />;
    return (
      <AuthScreen
        onBackToHome={() => setShowSignIn(false)}
        onSuccess={(u, o, token) => {
          setUser(u);
          setOrg(o);
          setShowSignIn(false);
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify({ user: u, org: o, token }));
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  return <ConsoleShell user={user} org={org} onLogout={handleLogout} />;
}
