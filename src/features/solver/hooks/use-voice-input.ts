"use client";
import { useEffect, useRef, useState } from "react";
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
          length: number;
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function useVoiceInput(onTranscript: (text: string) => void) {
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.abort();
      }
    },
    [],
  );
  function start() {
    setError("");
    const browser = window as SpeechWindow;
    const API = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!API) {
      setError(
        "Voice input is not supported in this browser. Try Chrome, or type your problem instead.",
      );
      return;
    }
    const instance = new API();
    recognition.current = instance;
    instance.lang = "en-US";
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = (event) => {
      onTranscript(event.results[0][0].transcript);
    };
    instance.onerror = (event) => {
      setListening(false);
      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied. Allow it in browser settings, or use text input."
          : "We could not hear that clearly. Please try again or type your problem.",
      );
    };
    instance.onend = () => setListening(false);
    try {
      instance.start();
      setListening(true);
    } catch {
      setError("Microphone could not start. Please try again.");
    }
  }
  function stop() {
    recognition.current?.stop();
    setListening(false);
  }
  return { start, stop, listening, error };
}
