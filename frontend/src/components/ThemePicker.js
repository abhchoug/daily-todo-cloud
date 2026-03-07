"use client";

import { useEffect, useRef } from "react";
import { DESIGN_THEMES } from "@/lib/constants";

export default function ThemePicker({ designTheme, onChange, onClose }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap: focus the picker on mount
  useEffect(() => {
    if (pickerRef.current) {
      const firstButton = pickerRef.current.querySelector("button");
      if (firstButton) firstButton.focus();
    }
  }, []);

  return (
    <div
      className="theme-picker-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose theme"
    >
      <div
        className="theme-picker"
        ref={pickerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>🎨 Choose Theme</h3>
        <div className="theme-grid" role="radiogroup" aria-label="Theme options">
          {DESIGN_THEMES.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${designTheme === theme.id ? "active" : ""}`}
              onClick={() => onChange(theme.id)}
              role="radio"
              aria-checked={designTheme === theme.id}
              aria-label={`${theme.name}: ${theme.description}`}
            >
              <span className="theme-option-icon" aria-hidden="true">{theme.icon}</span>
              <span className="theme-option-name">{theme.name}</span>
              <span className="theme-option-desc">{theme.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
