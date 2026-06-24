import React, { useState, useReducer, useEffect } from 'react';
import './OrgApp.css';

// ─── Todo Reducer ────────────────────────────────────────────────────────────

const PRIORITY = { high: 1, medium: 2, low: 3 };

function todosReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, { ...action.todo, id: Date.now(), completed: false, createdAt: new Date().toISOString() }];
    case 'TOGGLE':
      return state.map(t => t.id === action.id ? { ...t, completed: !t.completed } : t);
    case 'DELETE':
      return state.filter(t => t.id !== action.id);
    case 'EDIT':
      return state.map(t => t.id === action.id ? { ...t, ...action.updates } : t);
    case 'LOAD':
      return action.todos;
    default:
      return state;
  }
}

// ─── Calendar Event Reducer ───────────────────────────────────────────────────

function eventsReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, { ...action.event, id: Date.now() }];
    case 'DELETE':
      return state.filter(e => e.id !== action.id);
    case 'EDIT':
      return state.map(e => e.id === action.id ? { ...e, ...action.updates } : e);
    case 'LOAD':
      return action.events;
    default:
      return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

// ─── TodoItem ─────────────────────────────────────────────────────────────────

function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: todo.title, priority: todo.priority, dueDate: todo.dueDate || '' });

  const save = () => {
    if (!draft.title.trim()) return;
    onEdit(todo.id, draft);
    setEditing(false);
  };

  const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < todayStr();

  if (editing) {
    return (
      <div className="todo-item editing">
        <input
          className="todo-edit-input"
          value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
        />
        <div className="todo-edit-meta">
          <select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value })}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
        </div>
        <div className="todo-item-actions">
          <button className="btn-save" onClick={save}>Save</button>
          <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`}>
      <label className="todo-check">
        <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} />
        <span className="checkmark" />
      </label>
      <div className="todo-body">
        <span className="todo-title">{todo.title}</span>
        <div className="todo-meta">
          <span className={`priority-badge ${todo.priority}`}>{todo.priority}</span>
          {todo.dueDate && (
            <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
              {isOverdue ? 'Overdue: ' : 'Due: '}{todo.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="todo-item-actions">
        <button className="btn-icon" title="Edit" onClick={() => setEditing(true)}>✏️</button>
        <button className="btn-icon btn-delete" title="Delete" onClick={() => onDelete(todo.id)}>🗑</button>
      </div>
    </div>
  );
}

// ─── TodoList ─────────────────────────────────────────────────────────────────

function TodoList({ todos, dispatch }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');

  const addTodo = e => {
    e.preventDefault();
    if (!title.trim()) return;
    dispatch({ type: 'ADD', todo: { title: title.trim(), priority, dueDate } });
    setTitle('');
    setDueDate('');
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return PRIORITY[a.priority] - PRIORITY[b.priority];
    if (sortBy === 'due') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const counts = { all: todos.length, active: todos.filter(t => !t.completed).length, completed: todos.filter(t => t.completed).length };

  return (
    <div className="todo-section">
      <form className="todo-add-form" onSubmit={addTodo}>
        <input
          className="todo-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add a new task..."
        />
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <button type="submit" className="btn-add">Add Task</button>
      </form>

      <div className="todo-controls">
        <div className="filter-tabs">
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="sort-control">
          <label>Sort by:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="created">Date Added</option>
            <option value="priority">Priority</option>
            <option value="due">Due Date</option>
          </select>
        </div>
      </div>

      <div className="todo-list">
        {sorted.length === 0 ? (
          <div className="empty-state">No tasks yet. Add one above!</div>
        ) : (
          sorted.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={id => dispatch({ type: 'TOGGLE', id })}
              onDelete={id => dispatch({ type: 'DELETE', id })}
              onEdit={(id, updates) => dispatch({ type: 'EDIT', id, updates })}
            />
          ))
        )}
      </div>

      {todos.some(t => t.completed) && (
        <button
          className="btn-clear"
          onClick={() => todos.filter(t => t.completed).forEach(t => dispatch({ type: 'DELETE', id: t.id }))}
        >
          Clear Completed
        </button>
      )}
    </div>
  );
}

// ─── EventModal ───────────────────────────────────────────────────────────────

function EventModal({ date, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [color, setColor] = useState('#4f86f7');
  const [notes, setNotes] = useState('');

  const submit = e => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), date, time, color, notes });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>New Event — {date}</h3>
        <form onSubmit={submit}>
          <input
            className="modal-input"
            placeholder="Event title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <div className="modal-row">
            <label>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="modal-row">
            <label>Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </div>
          <textarea
            className="modal-input"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
          <div className="modal-actions">
            <button type="submit" className="btn-add">Save Event</button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ events, dispatch }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: totalDays }, (_, i) => i + 1));

  const eventsOnDate = date => events.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));

  const dayClick = day => {
    const date = toDateStr(year, month, day);
    setSelectedDate(date);
    setShowModal(true);
  };

  const today = todayStr();

  return (
    <div className="calendar-section">
      <div className="calendar-header">
        <button className="cal-nav" onClick={prevMonth}>◀</button>
        <h2 className="cal-title">{MONTHS[month]} {year}</h2>
        <button className="cal-nav" onClick={nextMonth}>▶</button>
      </div>

      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="cal-cell empty" />;
          const dateStr = toDateStr(year, month, day);
          const dayEvents = eventsOnDate(dateStr);
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              className={`cal-cell ${isToday ? 'today' : ''} ${dayEvents.length ? 'has-events' : ''}`}
              onClick={() => dayClick(day)}
            >
              <span className="cal-day-num">{day}</span>
              <div className="cal-events">
                {dayEvents.slice(0, 2).map(e => (
                  <span key={e.id} className="cal-event-dot" style={{ background: e.color }} title={`${e.time} — ${e.title}`}>
                    {e.time.slice(0, 5)} {e.title.length > 10 ? e.title.slice(0, 10) + '…' : e.title}
                  </span>
                ))}
                {dayEvents.length > 2 && <span className="cal-more">+{dayEvents.length - 2} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <EventModal
          date={selectedDate}
          onClose={() => setShowModal(false)}
          onSave={event => dispatch({ type: 'ADD', event })}
        />
      )}

      <div className="upcoming-events">
        <h3>Upcoming Events</h3>
        {events
          .filter(e => e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
          .slice(0, 10)
          .map(e => (
            <div key={e.id} className="upcoming-event-item">
              <span className="event-color-dot" style={{ background: e.color }} />
              <div className="event-details">
                <span className="event-title">{e.title}</span>
                <span className="event-datetime">{e.date} at {e.time}</span>
                {e.notes && <span className="event-notes">{e.notes}</span>}
              </div>
              <button className="btn-icon btn-delete" onClick={() => dispatch({ type: 'DELETE', id: e.id })}>🗑</button>
            </div>
          ))}
        {!events.some(e => e.date >= today) && (
          <div className="empty-state">No upcoming events. Click a day to add one!</div>
        )}
      </div>
    </div>
  );
}

// ─── OrgApp (root) ────────────────────────────────────────────────────────────

const STORAGE_KEYS = { todos: 'orgapp_todos', events: 'orgapp_events' };

function loadFromStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

export default function OrgApp() {
  const [tab, setTab] = useState('todo');
  const [todos, todoDispatch] = useReducer(todosReducer, [], () => loadFromStorage(STORAGE_KEYS.todos, []));
  const [events, eventDispatch] = useReducer(eventsReducer, [], () => loadFromStorage(STORAGE_KEYS.events, []));

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events)); }, [events]);

  const activeTodos = todos.filter(t => !t.completed).length;
  const todayEvents = events.filter(e => e.date === todayStr()).length;

  return (
    <div className="org-app">
      <header className="org-header">
        <div className="org-header-left">
          <h1 className="org-title">Organizer</h1>
          <p className="org-subtitle">Stay on top of your tasks and schedule</p>
        </div>
        <div className="org-stats">
          <div className="stat-chip">
            <span className="stat-num">{activeTodos}</span>
            <span className="stat-label">Active Tasks</span>
          </div>
          <div className="stat-chip">
            <span className="stat-num">{todayEvents}</span>
            <span className="stat-label">Events Today</span>
          </div>
        </div>
      </header>

      <nav className="org-tabs">
        <button className={`org-tab ${tab === 'todo' ? 'active' : ''}`} onClick={() => setTab('todo')}>
          ✅ To-Do List
          {activeTodos > 0 && <span className="tab-badge">{activeTodos}</span>}
        </button>
        <button className={`org-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          📅 Calendar
          {todayEvents > 0 && <span className="tab-badge">{todayEvents}</span>}
        </button>
      </nav>

      <main className="org-main">
        {tab === 'todo' && <TodoList todos={todos} dispatch={todoDispatch} />}
        {tab === 'calendar' && <Calendar events={events} dispatch={eventDispatch} />}
      </main>
    </div>
  );
}
