"use client";

import { useRef, useCallback } from "react";
import { monthNames, START_YEAR, END_YEAR } from "@/lib/constants";

export default function AppHeader({
  selectedYear, selectedMonth, onYearChange, onMonthChange,
  user, onLogout, onToggleTheme, today, taskCountByMonth,
}) {
  const touchStartX = useRef(null);

  const goToToday = useCallback(() => {
    onYearChange(today.getFullYear());
    onMonthChange(today.getMonth());
  }, [today, onYearChange, onMonthChange]);

  const isCurrentMonth =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && selectedMonth < 11) {
        onMonthChange(selectedMonth + 1);
      } else if (diff < 0 && selectedMonth > 0) {
        onMonthChange(selectedMonth - 1);
      }
    }
    touchStartX.current = null;
  }

  return (
    <header className="app-header" role="banner">
      <div className="header-left">
        <div className="logo-area">
          <div className="logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="4" width="24" height="22" rx="4" stroke="var(--accent)" strokeWidth="2" fill="none"/>
              <line x1="2" y1="10" x2="26" y2="10" stroke="var(--accent)" strokeWidth="2"/>
              <line x1="9" y1="2" x2="9" y2="6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="19" y1="2" x2="19" y2="6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="14" cy="18" r="3" fill="var(--accent)"/>
            </svg>
          </div>
          <div className="logo-text">
            <h1>Daily Tasks</h1>
            <p>Plan beautifully</p>
          </div>
        </div>
        <div className="year-selector">
          <select
            id="year"
            value={selectedYear}
            onChange={(event) => onYearChange(Number(event.target.value))}
            aria-label="Select year"
          >
            {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => {
              const yearValue = START_YEAR + index;
              return (
                <option key={yearValue} value={yearValue}>
                  {yearValue}
                </option>
              );
            })}
          </select>
        </div>
        {!isCurrentMonth && (
          <button
            type="button"
            className="today-btn"
            onClick={goToToday}
            aria-label="Go to today"
            title="Jump to today"
          >
            Today
          </button>
        )}
      </div>

      <nav
        className="month-nav"
        aria-label="Month navigation"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="month-nav-list" role="tablist">
          {monthNames.map((month, index) => {
            const count = taskCountByMonth[index] || 0;
            return (
              <button
                key={month}
                type="button"
                role="tab"
                className={`month-pill ${index === selectedMonth ? "active" : ""}`}
                onClick={() => onMonthChange(index)}
                aria-selected={index === selectedMonth}
                aria-label={`${month}${count > 0 ? `, ${count} tasks` : ""}`}
              >
                {month}
                {count > 0 && <span className="task-count-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="header-right">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title="Change theme"
          aria-label="Change color theme"
        >
          🎨
        </button>
        {user && (
          <div className="user-area">
            <span
              className="user-avatar"
              aria-label={`Logged in as ${user.displayName || user.email}`}
            >
              {(user.displayName || user.email || "U")[0].toUpperCase()}
            </span>
            <button type="button" className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
