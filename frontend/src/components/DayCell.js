"use client";

import { formatDayHeader } from "@/lib/utils";
import TaskItem from "./TaskItem";

export default function DayCell({
  dateKey, day, year, month, isToday, isPast, tasks,
  onTaskCheck, onTaskTextChange, onTaskBlur, onTaskDelete, savingTasks,
}) {
  const realTasks = tasks.filter((t) => !t.placeholder);
  const isEmpty = realTasks.length === 0;

  const classNames = [
    "day",
    isToday && "today",
    isPast && !isToday && "past",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      role="gridcell"
      aria-label={`${formatDayHeader(year, month, day)}${isToday ? " (Today)" : ""}${isPast && !isToday ? " (Past)" : ""}`}
      aria-current={isToday ? "date" : undefined}
    >
      <h3>{formatDayHeader(year, month, day)}</h3>
      <div className="task-container">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            dateKey={dateKey}
            onCheck={onTaskCheck}
            onTextChange={onTaskTextChange}
            onBlur={onTaskBlur}
            onDelete={onTaskDelete}
            isSaving={savingTasks.has(task.id)}
          />
        ))}
        {isEmpty && (
          <div className="empty-state" aria-hidden="true">
            <span>+ Add a task</span>
          </div>
        )}
      </div>
    </div>
  );
}
