"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { firebase, firebaseConfigured } from "@/lib/firebase";

/*
  Signing in with Firebase Authentication: email and password, or Google.
  Firebase stores passwords safely (Rememba never sees or saves them), sends the
  "reset password" emails, and limits repeated wrong guesses.
*/

export type AuthState = { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; user: User };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: firebaseConfigured ? "loading" : "signedOut" });
  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(firebase().auth, (user) => setState(user ? { status: "signedIn", user } : { status: "signedOut" }));
  }, []);
  return state;
}

export const signInEmail = (email: string, password: string) => signInWithEmailAndPassword(firebase().auth, email.trim(), password);
export const signUpEmail = (email: string, password: string) => createUserWithEmailAndPassword(firebase().auth, email.trim(), password);
export const signInGoogle = () => signInWithPopup(firebase().auth, new GoogleAuthProvider());
export const resetPassword = (email: string) => sendPasswordResetEmail(firebase().auth, email.trim());
export const signOutUser = () => signOut(firebase().auth);

/** Firebase error codes → a plain-language message */
export function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "That email and password don't match. Check them, or reset your password.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Sign in instead.";
    case "auth/weak-password":
      return "Choose a password of at least 6 characters.";
    case "auth/invalid-email":
      return "That doesn't look like an email address.";
    case "auth/too-many-requests":
      return "Too many tries. Wait a few minutes and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window was closed before signing in.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/network-request-failed":
      return "You're offline. Connect to the internet to sign in.";
    default:
      return "Something went wrong. Please try again.";
  }
}
