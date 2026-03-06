"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthThemeClasses = [
  "month-january",
  "month-february",
  "month-march",
  "month-april",
  "month-may",
  "month-june",
  "month-july",
  "month-august",
  "month-september",
  "month-october",
  "month-november",
  "month-december",
];

const DESIGN_THEMES = [
  { id: "glassmorphism", name: "Glassmorphism Dark", icon: "🔮", description: "Modern frosted glass with neon accents" },
  { id: "notion", name: "Notion Minimal", icon: "📋", description: "Clean, distraction-free productivity" },
  { id: "cyberpunk", name: "Neon Cyberpunk", icon: "⚡", description: "Futuristic neon glow aesthetic" },
  { id: "pastel", name: "Soft Pastel", icon: "🌸", description: "Warm, calming gradient aesthetic" },
  { id: "material", name: "Material You", icon: "🎨", description: "Google's modern Material Design 3" },
  { id: "sonoma", name: "macOS Sonoma", icon: "🍎", description: "Apple's sleek dark mode calendar" },
];

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const START_YEAR = 2024;
const END_YEAR = 2030;

function pad(number) {
  return String(number).padStart(2, "0");
}

function getDateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDayHeader(year, month, day) {
  const shortMonth = new Intl.DateTimeFormat("en", { month: "short" }).format(
    new Date(year, month)
  );
  return `${day}-${shortMonth}-${String(year).slice(-2)}`;
}

function createPlaceholder(dateKey) {
  return { id: `placeholder-${dateKey}`, text: "", checked: false, placeholder: true };
}

function withPlaceholder(tasks, dateKey) {
  const hasPlaceholder = tasks.some((task) => task.placeholder);
  return hasPlaceholder ? tasks : [...tasks, createPlaceholder(dateKey)];
}

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [tasksByDate, setTasksByDate] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [designTheme, setDesignTheme] = useState("sonoma");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const notificationTimer = useRef(null);
  const monthNavRef = useRef(null);

  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth + 1, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  const firstDayIndex = useMemo(() => {
    const dayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
    return dayIndex === 0 ? 6 : dayIndex - 1;
  }, [selectedYear, selectedMonth]);

  const monthTheme = monthThemeClasses[selectedMonth] || "";

  function changeDesignTheme(themeId) {
    setDesignTheme(themeId);
    try {
      localStorage.setItem("designTheme", themeId);
    } catch (_) {
      /* noop */
    }
    setShowThemePicker(false);
  }

  function showNotification(message, type = "info") {
    setNotification({ message, type });

    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
    }

    notificationTimer.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  }

  function ensureMonthPlaceholders() {
    const placeholders = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = getDateKey(selectedYear, selectedMonth, day);
      placeholders[dateKey] = [createPlaceholder(dateKey)];
    }
    setTasksByDate(placeholders);
  }

  async function loadMonthTasks(currentUser) {
    if (!currentUser) return;

    setLoading(true);
    try {
      const monthStart = `${selectedYear}-${pad(selectedMonth + 1)}-01`;
      const nextMonthDate = new Date(selectedYear, selectedMonth + 1, 1);
      const monthEnd = `${nextMonthDate.getFullYear()}-${pad(nextMonthDate.getMonth() + 1)}-01`;

      const tasksRef = collection(db, "users", currentUser.uid, "tasks");
      const tasksQuery = query(
        tasksRef,
        where("date", ">=", monthStart),
        where("date", "<", monthEnd),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(tasksQuery);
      const tasksForMonth = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const dateKey = data.date;
        if (!tasksForMonth[dateKey]) {
          tasksForMonth[dateKey] = [];
        }
        tasksForMonth[dateKey].push({ id: docSnap.id, text: data.text || "", checked: !!data.checked });
      });

      setTasksByDate((prev) => {
        const next = { ...prev };
        Object.entries(tasksForMonth).forEach(([dateKey, tasks]) => {
          next[dateKey] = withPlaceholder(tasks, dateKey);
        });
        return next;
      });
    } catch (error) {
      console.error("Error loading tasks:", error);
      showNotification("Failed to load tasks.", "error");
    } finally {
      setLoading(false);
    }
  }

  function updateTaskState(dateKey, updater) {
    setTasksByDate((prev) => {
      const current = prev[dateKey] || [createPlaceholder(dateKey)];
      const updated = updater(current);
      return { ...prev, [dateKey]: withPlaceholder(updated, dateKey) };
    });
  }

  async function handleTaskBlur(dateKey, task) {
    if (!user) return;

    const text = task.text.trim();
    if (task.placeholder) {
      if (!text) return;

      try {
        const tasksRef = collection(db, "users", user.uid, "tasks");
        const docRef = await addDoc(tasksRef, {
          date: dateKey,
          text,
          checked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        updateTaskState(dateKey, (current) => {
          const withoutPlaceholder = current.filter((item) => !item.placeholder);
          return [...withoutPlaceholder, { id: docRef.id, text, checked: false }];
        });
      } catch (error) {
        console.error("Error adding task:", error);
        showNotification("Failed to add task", "error");
      }
      return;
    }

    if (!text) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "tasks", task.id));
        updateTaskState(dateKey, (current) => current.filter((item) => item.id !== task.id));
      } catch (error) {
        console.error("Error deleting task:", error);
        showNotification("Failed to delete task", "error");
      }
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid, "tasks", task.id), {
        text,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating task:", error);
      showNotification("Failed to update task", "error");
    }
  }

  async function handleTaskCheck(dateKey, task, checked) {
    if (!user || task.placeholder) return;

    updateTaskState(dateKey, (current) =>
      current.map((item) => (item.id === task.id ? { ...item, checked } : item))
    );

    try {
      await updateDoc(doc(db, "users", user.uid, "tasks", task.id), {
        checked,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating task:", error);
      showNotification("Failed to update task", "error");
    }
  }

  function handleTaskTextChange(dateKey, taskId, value) {
    updateTaskState(dateKey, (current) =>
      current.map((task) => (task.id === taskId ? { ...task, text: value } : task))
    );
  }

  function resizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  // Resize all textareas whenever tasks load or change (e.g. after Firestore fetch)
  useEffect(() => {
    document.querySelectorAll(".task textarea").forEach((textarea) => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [tasksByDate]);

  useEffect(() => {
    document.body.className = `theme-${designTheme} ${monthTheme}`;
  }, [designTheme, monthTheme]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("designTheme");
      if (saved && DESIGN_THEMES.some((t) => t.id === saved)) {
        setDesignTheme(saved);
      }
    } catch (_) {
      /* noop */
    }
  }, []);

  useEffect(() => {
    ensureMonthPlaceholders();
    if (user) {
      loadMonthTasks(user);
    }
  }, [user, selectedYear, selectedMonth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser || null);
      if (!nextUser) {
        setTasksByDate({});
      }
    });

    return () => {
      unsubscribe();
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current);
      }
    };
  }, []);

  async function handleEmailAuth(event) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    setLoading(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        showNotification("Signed in successfully!", "success");
      } catch (signInError) {
        if (signInError.code === "auth/user-not-found") {
          await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          showNotification("Account created! Welcome!", "success");
        } else {
          throw signInError;
        }
      }
    } catch (error) {
      console.error("Auth error:", error);

      let message = "An error occurred. Please try again.";
      if (error.code === "auth/invalid-email") {
        message = "Invalid email address";
      } else if (error.code === "auth/weak-password") {
        message = "Password must be at least 6 characters";
      } else if (error.code === "auth/email-already-in-use") {
        message = "Email already in use. Please sign in.";
      } else if (error.code === "auth/wrong-password") {
        message = "Incorrect password. Try again.";
      }

      showNotification(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleProviderSignIn(provider) {
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      showNotification("Signed in successfully!", "success");
    } catch (error) {
      console.error("Provider sign-in error:", error);
      showNotification("Sign-in failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setEmail("");
      setPassword("");
      showNotification("Logged out successfully", "success");
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Logout failed. Please try again.", "error");
    }
  }

  // For a weekday-only grid: if the month starts on Sat (5) or Sun (6), treat
  // the first weekday column offset as 0 (the first rendered day is Mon).
  const weekdayFirstIndex = firstDayIndex < 5 ? firstDayIndex : 0;

  const calendarCells = [];
  dayNames.forEach((name) => {
    calendarCells.push(
      <div key={`day-name-${name}`} className="day-name">
        {name}
      </div>
    );
  });

  for (let i = 0; i < weekdayFirstIndex; i += 1) {
    calendarCells.push(<div key={`empty-${i}`} className="empty-day" />);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = getDateKey(selectedYear, selectedMonth, day);
    const tasks = tasksByDate[dateKey] || [createPlaceholder(dateKey)];
    const dayOfWeek = (firstDayIndex + day - 1) % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    // Skip Saturday and Sunday entirely — no cell rendered
    if (isWeekend) continue; // eslint-disable-line no-continue

    const isToday =
      day === today.getDate() &&
      selectedMonth === today.getMonth() &&
      selectedYear === today.getFullYear();

    calendarCells.push(
      <div
        key={`day-${dateKey}`}
        className={`day ${isToday ? "today" : ""}`}
      >
        <h3>{formatDayHeader(selectedYear, selectedMonth, day)}</h3>
        <div className="task-container">
          {tasks.map((task) => (
            <div key={task.id} className="task">
              <input
                type="checkbox"
                checked={!!task.checked}
                disabled={task.placeholder}
                onChange={(event) => handleTaskCheck(dateKey, task, event.target.checked)}
              />
              <textarea
                value={task.text}
                placeholder="Add task"
                rows={1}
                onChange={(event) => handleTaskTextChange(dateKey, task.id, event.target.value)}
                onInput={resizeTextarea}
                onBlur={() => handleTaskBlur(dateKey, task)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        {/* Top Navigation Header */}
        <div className="app-header">
          <div className="header-left">
            <div className="logo-area">
              <div className="logo-icon">✨📅</div>
              <div className="logo-text">
                <h1>Daily Tasks</h1>
                <p>Plan beautifully</p>
              </div>
            </div>
            <div className="year-selector">
              <select
                id="year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
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
          </div>

          <div className="month-nav" ref={monthNavRef}>
            <ul>
              {monthNames.map((month, index) => (
                <li
                  key={month}
                  data-month={index}
                  className={index === selectedMonth ? "active" : ""}
                  onClick={() => setSelectedMonth(index)}
                >
                  {month}
                </li>
              ))}
            </ul>
          </div>

          <div className="header-right">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setShowThemePicker(!showThemePicker)}
              title="Change theme"
            >
              🎨
            </button>
            {user && (
              <div className="user-area">
                <span className="user-avatar">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </span>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Theme Picker Dropdown */}
        {showThemePicker && (
          <div className="theme-picker-overlay" onClick={() => setShowThemePicker(false)}>
            <div className="theme-picker" onClick={(e) => e.stopPropagation()}>
              <h3>🎨 Choose Theme</h3>
              <div className="theme-grid">
                {DESIGN_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className={`theme-option ${designTheme === theme.id ? "active" : ""}`}
                    onClick={() => changeDesignTheme(theme.id)}
                  >
                    <span className="theme-option-icon">{theme.icon}</span>
                    <span className="theme-option-name">{theme.name}</span>
                    <span className="theme-option-desc">{theme.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className={`calendar ${monthTheme}`}>{calendarCells}</div>
      </div>

      {!user && (
        <div className="auth-overlay">
          <div className="auth-card">
            <h2>Welcome to Daily Tasks</h2>
            <p>Sign in to sync your calendar everywhere.</p>
            <form onSubmit={handleEmailAuth}>
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit" className="primary-btn">
                Sign In / Sign Up
              </button>
            </form>
            <div className="auth-divider">or</div>
            <button
              type="button"
              className="provider-btn"
              onClick={() => handleProviderSignIn(new GoogleAuthProvider())}
            >
              🔵 Continue with Google
            </button>
            <button
              type="button"
              className="provider-btn github"
              onClick={() => handleProviderSignIn(new GithubAuthProvider())}
            >
              🐙 Continue with GitHub
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}
    </>
  );
}
