"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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

import { auth, db, isDemoMode } from "@/lib/firebase";
import { monthNames, monthThemeClasses, dayNames, DESIGN_THEMES } from "@/lib/constants";
import { pad, getDateKey, createPlaceholder, withPlaceholder } from "@/lib/utils";

import ErrorBoundary from "@/components/ErrorBoundary";
import AppHeader from "@/components/AppHeader";
import ThemePicker from "@/components/ThemePicker";
import DayCell from "@/components/DayCell";
import AuthOverlay from "@/components/AuthOverlay";
import Notification from "@/components/Notification";
import NotesPanel from "@/components/NotesPanel";

// Demo mode: fake user object and ID counter for in-memory tasks
const DEMO_USER = isDemoMode ? { uid: "demo", displayName: "Demo User", email: "demo@local" } : null;
let demoIdCounter = 0;

export default function Home() {
  const [today, setToday] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [tasksByDate, setTasksByDate] = useState({});
  const [user, setUser] = useState(isDemoMode ? DEMO_USER : null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [designTheme, setDesignTheme] = useState("sonoma");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [savingTasks, setSavingTasks] = useState(new Set());
  const [taskCountByMonth, setTaskCountByMonth] = useState({});
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [notes, setNotes] = useState([]);
  const notificationTimer = useRef(null);
  const touchStartX = useRef(null);

  /* ── Keep "today" fresh across midnight / tab switch ── */
  useEffect(() => {
    function checkDate() {
      const now = new Date();
      if (
        now.getDate() !== today.getDate() ||
        now.getMonth() !== today.getMonth() ||
        now.getFullYear() !== today.getFullYear()
      ) {
        setToday(now);
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") checkDate();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(checkDate, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [today]);

  /* ── Derived values ── */
  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth + 1, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  const firstDayIndex = useMemo(() => {
    const dayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
    return dayIndex === 0 ? 6 : dayIndex - 1;
  }, [selectedYear, selectedMonth]);

  const monthTheme = monthThemeClasses[selectedMonth] || "";

  /* ── Theme helpers ── */
  function changeDesignTheme(themeId) {
    setDesignTheme(themeId);
    try {
      localStorage.setItem("designTheme", themeId);
    } catch (_) {
      /* noop */
    }
    setShowThemePicker(false);
  }

  /* ── Notification helper ── */
  function showNotification(message, type = "info") {
    setNotification({ message, type });
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotification(null), 3000);
  }

  /* ── Saving indicator helpers ── */
  function markSaving(taskId, isSaving) {
    setSavingTasks((prev) => {
      const next = new Set(prev);
      if (isSaving) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  /* ── Task state helpers ── */
  function ensureMonthPlaceholders() {
    const placeholders = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = getDateKey(selectedYear, selectedMonth, day);
      placeholders[dateKey] = [createPlaceholder(dateKey)];
    }
    setTasksByDate(placeholders);
  }

  function updateTaskState(dateKey, updater) {
    setTasksByDate((prev) => {
      const current = prev[dateKey] || [createPlaceholder(dateKey)];
      const updated = updater(current);
      return { ...prev, [dateKey]: withPlaceholder(updated, dateKey) };
    });
  }

  /* ── Firestore: load tasks for selected month ── */
  async function loadMonthTasks(currentUser) {
    if (!currentUser || isDemoMode) return;

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
      let taskCount = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const dateKey = data.date;
        if (!tasksForMonth[dateKey]) tasksForMonth[dateKey] = [];
        tasksForMonth[dateKey].push({
          id: docSnap.id,
          text: data.text || "",
          checked: !!data.checked,
        });
        taskCount += 1;
      });

      setTasksByDate((prev) => {
        const next = { ...prev };
        Object.entries(tasksForMonth).forEach(([dateKey, tasks]) => {
          next[dateKey] = withPlaceholder(tasks, dateKey);
        });
        return next;
      });

      // Cache task count for this month (used in month pill badges)
      setTaskCountByMonth((prev) => ({ ...prev, [selectedMonth]: taskCount }));
    } catch (error) {
      console.error("Error loading tasks:", error);
      showNotification("Failed to load tasks.", "error");
    } finally {
      setLoading(false);
    }
  }

  /* ── Task CRUD handlers ── */
  async function handleTaskBlur(dateKey, task) {
    if (!user) return;

    const text = task.text.trim();

    // New task from placeholder
    if (task.placeholder) {
      if (!text) return;
      markSaving(task.id, true);

      if (isDemoMode) {
        // Demo: in-memory only
        const newId = `demo-${++demoIdCounter}`;
        updateTaskState(dateKey, (current) => {
          const withoutPlaceholder = current.filter((item) => !item.placeholder);
          return [...withoutPlaceholder, { id: newId, text, checked: false }];
        });
        setTaskCountByMonth((prev) => ({
          ...prev,
          [selectedMonth]: (prev[selectedMonth] || 0) + 1,
        }));
        markSaving(task.id, false);
        return;
      }

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
        setTaskCountByMonth((prev) => ({
          ...prev,
          [selectedMonth]: (prev[selectedMonth] || 0) + 1,
        }));
      } catch (error) {
        console.error("Error adding task:", error);
        showNotification("Failed to add task", "error");
      } finally {
        markSaving(task.id, false);
      }
      return;
    }

    // Empty text → delete
    if (!text) {
      await handleTaskDelete(dateKey, task);
      return;
    }

    // Update existing task text
    markSaving(task.id, true);
    if (isDemoMode) {
      markSaving(task.id, false);
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
    } finally {
      markSaving(task.id, false);
    }
  }

  async function handleTaskDelete(dateKey, task) {
    if (!user || task.placeholder) return;
    markSaving(task.id, true);

    if (isDemoMode) {
      updateTaskState(dateKey, (current) =>
        current.filter((item) => item.id !== task.id)
      );
      setTaskCountByMonth((prev) => ({
        ...prev,
        [selectedMonth]: Math.max((prev[selectedMonth] || 1) - 1, 0),
      }));
      markSaving(task.id, false);
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.uid, "tasks", task.id));
      updateTaskState(dateKey, (current) =>
        current.filter((item) => item.id !== task.id)
      );
      setTaskCountByMonth((prev) => ({
        ...prev,
        [selectedMonth]: Math.max((prev[selectedMonth] || 1) - 1, 0),
      }));
    } catch (error) {
      console.error("Error deleting task:", error);
      showNotification("Failed to delete task", "error");
    } finally {
      markSaving(task.id, false);
    }
  }

  async function handleTaskCheck(dateKey, task, checked) {
    if (!user || task.placeholder) return;
    updateTaskState(dateKey, (current) =>
      current.map((item) => (item.id === task.id ? { ...item, checked } : item))
    );
    if (isDemoMode) return;
    markSaving(task.id, true);
    try {
      await updateDoc(doc(db, "users", user.uid, "tasks", task.id), {
        checked,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating task:", error);
      showNotification("Failed to update task", "error");
    } finally {
      markSaving(task.id, false);
    }
  }

  function handleTaskTextChange(dateKey, taskId, value) {
    updateTaskState(dateKey, (current) =>
      current.map((task) => (task.id === taskId ? { ...task, text: value } : task))
    );
  }

  /* ── Notes CRUD ── */
  async function loadNotes(currentUser) {
    if (!currentUser) return;
    if (isDemoMode) return;
    try {
      const notesRef = collection(db, "users", currentUser.uid, "notes");
      const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(notesQuery);
      const loaded = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({
          id: docSnap.id,
          title: data.title || "",
          content: data.content || "",
          createdAt: data.createdAt?.toMillis?.() || null,
          updatedAt: data.updatedAt?.toMillis?.() || null,
        });
      });
      setNotes(loaded);
    } catch (error) {
      console.error("Error loading notes:", error);
      showNotification("Failed to load notes.", "error");
    }
  }

  async function handleAddNote(title) {
    if (!user) return;
    if (isDemoMode) {
      const newNote = {
        id: `demo-note-${++demoIdCounter}`,
        title,
        content: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      return;
    }
    try {
      const notesRef = collection(db, "users", user.uid, "notes");
      const docRef = await addDoc(notesRef, {
        title,
        content: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNotes((prev) => [
        { id: docRef.id, title, content: "", createdAt: Date.now(), updatedAt: Date.now() },
        ...prev,
      ]);
    } catch (error) {
      console.error("Error adding note:", error);
      showNotification("Failed to add note.", "error");
    }
  }

  async function handleUpdateNote(noteId, updates) {
    if (!user) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates, updatedAt: Date.now() } : n))
    );
    if (isDemoMode) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "notes", noteId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating note:", error);
      showNotification("Failed to update note.", "error");
    }
  }

  async function handleDeleteNote(noteId) {
    if (!user) return;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (isDemoMode) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "notes", noteId));
    } catch (error) {
      console.error("Error deleting note:", error);
      showNotification("Failed to delete note.", "error");
    }
  }

  /* ── Auth handlers ── */
  async function handleEmailAuth(email, password, authMode) {
    if (!email || !password) {
      showNotification("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        showNotification("Account created! Welcome!", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification("Signed in successfully!", "success");
      }
    } catch (error) {
      console.error("Auth error:", error);
      const messages = {
        "auth/invalid-email": "Invalid email address",
        "auth/weak-password": "Password must be at least 6 characters",
        "auth/email-already-in-use": "Email already in use. Try signing in.",
        "auth/wrong-password": "Incorrect password. Try again.",
        "auth/user-not-found": "No account found. Try signing up.",
        "auth/invalid-credential": "Invalid credentials. Please check and try again.",
      };
      showNotification(
        messages[error.code] || "An error occurred. Please try again.",
        "error"
      );
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
      showNotification("Logged out successfully", "success");
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Logout failed. Please try again.", "error");
    }
  }

  /* ── Swipe gesture on calendar (mobile) ── */
  function handleCalendarTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleCalendarTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 60;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        if (selectedMonth < 11) setSelectedMonth(selectedMonth + 1);
        else {
          setSelectedMonth(0);
          setSelectedYear(selectedYear + 1);
        }
      } else {
        if (selectedMonth > 0) setSelectedMonth(selectedMonth - 1);
        else {
          setSelectedMonth(11);
          setSelectedYear(selectedYear - 1);
        }
      }
    }
    touchStartX.current = null;
  }

  /* ── Effects ── */
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
      loadNotes(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedYear, selectedMonth]);

  useEffect(() => {
    if (isDemoMode) return;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser || null);
      if (!nextUser) {
        setTasksByDate({});
        setTaskCountByMonth({});
        setNotes([]);
      }
    });
    return () => {
      unsubscribe();
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    };
  }, []);

  /* ── Build calendar grid cells ── */
  const weekdayFirstIndex = firstDayIndex < 5 ? firstDayIndex : 0;
  const todayDateKey = getDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const calendarCells = [];

  dayNames.forEach((name) => {
    calendarCells.push(
      <div key={`day-name-${name}`} className="day-name" role="columnheader">
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

    if (isWeekend) continue;

    const isToday =
      day === today.getDate() &&
      selectedMonth === today.getMonth() &&
      selectedYear === today.getFullYear();

    const isPast = dateKey < todayDateKey;

    calendarCells.push(
      <DayCell
        key={`day-${dateKey}`}
        dateKey={dateKey}
        day={day}
        year={selectedYear}
        month={selectedMonth}
        isToday={isToday}
        isPast={isPast}
        tasks={tasks}
        onTaskCheck={handleTaskCheck}
        onTaskTextChange={handleTaskTextChange}
        onTaskBlur={handleTaskBlur}
        onTaskDelete={handleTaskDelete}
        savingTasks={savingTasks}
      />
    );
  }

  /* ── Render ── */
  return (
    <ErrorBoundary>
      <div className="container">
        <AppHeader
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          user={user}
          onLogout={handleLogout}
          onToggleTheme={() => setShowThemePicker(!showThemePicker)}
          onToggleNotes={() => setShowNotesPanel(!showNotesPanel)}
          today={today}
          taskCountByMonth={taskCountByMonth}
        />

        {showThemePicker && (
          <ThemePicker
            designTheme={designTheme}
            onChange={changeDesignTheme}
            onClose={() => setShowThemePicker(false)}
          />
        )}

        {showNotesPanel && (
          <NotesPanel
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onClose={() => setShowNotesPanel(false)}
          />
        )}

        <div
          className={`calendar ${monthTheme}`}
          role="grid"
          aria-label={`Calendar for ${monthNames[selectedMonth]} ${selectedYear}`}
          onTouchStart={handleCalendarTouchStart}
          onTouchEnd={handleCalendarTouchEnd}
        >
          {calendarCells}
        </div>

        {loading && (
          <div className="loading-bar" role="progressbar" aria-label="Loading tasks">
            <div className="loading-bar-fill" />
          </div>
        )}
      </div>

      {!user && !isDemoMode && (
        <AuthOverlay
          onEmailAuth={handleEmailAuth}
          onProviderSignIn={handleProviderSignIn}
          loading={loading}
        />
      )}

      {isDemoMode && (
        <div className="demo-banner" role="status">
          Demo Mode — tasks are stored in memory only.
          Set Firebase env vars to enable cloud sync.
        </div>
      )}

      <Notification notification={notification} />
    </ErrorBoundary>
  );
}
