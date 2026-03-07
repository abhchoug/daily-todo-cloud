"use client";

export default function Notification({ notification }) {
  if (!notification) return null;

  return (
    <div
      className={`notification ${notification.type}`}
      role="alert"
      aria-live="polite"
    >
      {notification.type === "success" && <span className="notification-icon" aria-hidden="true">✓</span>}
      {notification.type === "error" && <span className="notification-icon" aria-hidden="true">!</span>}
      {notification.message}
    </div>
  );
}
