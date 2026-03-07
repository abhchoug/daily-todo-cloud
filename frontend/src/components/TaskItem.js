"use client";

import { useEffect, useRef } from "react";

export default function TaskItem({ task, dateKey, onCheck, onTextChange, onBlur, onDelete, isSaving }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea when text changes (e.g. after Firestore fetch)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [task.text]);

  function handleInput(event) {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  return (
    <div className={`task ${isSaving ? "task-saving" : ""}`}>
      <input
        type="checkbox"
        checked={!!task.checked}
        disabled={task.placeholder}
        onChange={(event) => onCheck(dateKey, task, event.target.checked)}
        aria-label={
          task.text
            ? `Mark "${task.text}" as ${task.checked ? "incomplete" : "complete"}`
            : "Task checkbox"
        }
      />
      <textarea
        ref={textareaRef}
        value={task.text}
        placeholder="Add task..."
        rows={1}
        onChange={(event) => onTextChange(dateKey, task.id, event.target.value)}
        onInput={handleInput}
        onBlur={() => onBlur(dateKey, task)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        aria-label={task.placeholder ? "New task input" : `Edit task: ${task.text}`}
      />
      {!task.placeholder && task.text && (
        <button
          type="button"
          className="task-delete-btn"
          onClick={() => onDelete(dateKey, task)}
          aria-label={`Delete task: ${task.text}`}
          title="Delete task"
        >
          ×
        </button>
      )}
      {isSaving && (
        <span className="save-indicator" aria-label="Saving">
          <svg width="14" height="14" viewBox="0 0 14 14" className="save-spinner">
            <circle cx="7" cy="7" r="5" stroke="var(--accent)" strokeWidth="2" fill="none" strokeDasharray="20" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
}
