"use client";

import React, { useEffect, useState } from "react";
import AuthScreen, { AuthenticatedOrg, AuthenticatedUser } from "../components/AuthScreen";
import LandingPage from "../components/LandingPage";
import ConsoleShell from "../components/console/ConsoleShell";

const SESSION_KEY = "agent_identity_session";

export default function HomePage() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [org, setOrg] = useState<AuthenticatedOrg | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [ready, setReady] = useState(false);

  // Restore a saved session (per-browser convenience only).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved?.user && saved?.org) {
        setUser(saved.user);
        setOrg(saved.org);
      }
    } catch {
      // ignore unreadable storage
    }
    setReady(true);
  }, []);

  function handleLogout() {
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
