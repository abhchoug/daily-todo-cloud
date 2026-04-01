"use client";

import { useState, useRef, useEffect } from "react";

export default function NotesPanel({ notes, onAddNote, onUpdateNote, onDeleteNote, onClose }) {
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const titleInputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleAddNote(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    onAddNote(title);
    setNewTitle("");
  }

  function handleNoteContentBlur(note, newContent) {
    if (newContent !== note.content) {
      onUpdateNote(note.id, { content: newContent });
    }
  }

  function handleNoteTitleBlur(note, newTitle) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    if (trimmed !== note.title) {
      onUpdateNote(note.id, { title: trimmed });
    }
  }

  function toggleExpand(noteId) {
    setExpandedNoteId((prev) => (prev === noteId ? null : noteId));
  }

  return (
    <>
      <div className="notes-panel-overlay" onClick={onClose} />
      <aside className="notes-panel" ref={panelRef} role="complementary" aria-label="Projects &amp; Notes">
        <div className="notes-panel-header">
          <h2>Projects &amp; Notes</h2>
          <button
            type="button"
            className="notes-panel-close"
            onClick={onClose}
            aria-label="Close notes panel"
          >
            ✕
          </button>
        </div>

        <form className="notes-add-form" onSubmit={handleAddNote}>
          <input
            ref={titleInputRef}
            type="text"
            className="notes-add-input"
            placeholder="New project or note title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={200}
          />
          <button type="submit" className="notes-add-btn" disabled={!newTitle.trim()}>
            + Add
          </button>
        </form>

        <div className="notes-list">
          {notes.length === 0 && (
            <div className="notes-empty">
              <p>No projects or notes yet.</p>
              <p className="notes-empty-hint">Add one above to get started!</p>
            </div>
          )}
          {notes.map((note) => {
            const isExpanded = expandedNoteId === note.id;
            return (
              <div key={note.id} className={`notes-item ${isExpanded ? "expanded" : ""}`}>
                <div className="notes-item-header" onClick={() => toggleExpand(note.id)}>
                  <span className="notes-item-arrow">{isExpanded ? "▾" : "▸"}</span>
                  <input
                    type="text"
                    className="notes-item-title"
                    defaultValue={note.title}
                    onBlur={(e) => handleNoteTitleBlur(note, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={200}
                  />
                  <button
                    type="button"
                    className="notes-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    aria-label={`Delete ${note.title}`}
                    title="Delete note"
                  >
                    ✕
                  </button>
                </div>
                {isExpanded && (
                  <div className="notes-item-body">
                    <textarea
                      className="notes-item-content"
                      defaultValue={note.content || ""}
                      placeholder="Write your notes here…"
                      onBlur={(e) => handleNoteContentBlur(note, e.target.value)}
                      rows={6}
                    />
                    {note.updatedAt && (
                      <span className="notes-item-meta">
                        Last edited: {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
