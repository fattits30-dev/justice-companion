import React, { useState, useEffect } from 'react';
import './TimelineManager.css';

// Professional Timeline Manager for Legal Cases
// Track important dates and case milestones

const TimelineManager = ({ currentCase, onAddEvent }) => {
  const [events, setEvents] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    date: '',
    time: '',
    title: '',
    description: '',
    type: 'general',
    importance: 'medium'
  });

  // Mock events for demonstration
  useEffect(() => {
    if (currentCase) {
      setEvents([
        {
          id: 1,
          date: '2024-01-15',
          time: '09:00',
          title: 'Case Opened',
          description: 'Initial case registration and documentation started',
          type: 'milestone',
          importance: 'high'
        },
        {
          id: 2,
          date: '2024-01-20',
          time: '14:30',
          title: 'Initial Consultation',
          description: 'First meeting with legal advisor to assess situation',
          type: 'meeting',
          importance: 'high'
        }
      ]);
    }
  }, [currentCase]);

  const handleAddEvent = async () => {
    if (!newEvent.date || !newEvent.title) return;

    const eventData = {
      ...newEvent,
      id: Date.now(),
      timestamp: new Date(`${newEvent.date}T${newEvent.time || '12:00'}`).toISOString()
    };

    try {
      const result = await onAddEvent(eventData);
      if (result.success) {
        setEvents(prev => [...prev, eventData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        setNewEvent({
          date: '',
          time: '',
          title: '',
          description: '',
          type: 'general',
          importance: 'medium'
        });
        setShowAddEvent(false);
      }
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const getEventIcon = (type) => {
    const icons = {
      milestone: '🏁',
      meeting: '👥',
      deadline: '⏰',
      filing: '📋',
      court: '⚖️',
      communication: '📧',
      general: '📝'
    };
    return icons[type] || '📝';
  };

  const getImportanceClass = (importance) => {
    return `importance-${importance}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentCase) {
    return (
      <div className="timeline-manager no-case">
        <div className="no-case-message">
          <div className="icon">📅</div>
          <h2>Select a Case First</h2>
          <p>Choose a case from the sidebar to view its timeline.</p>
          <button
            className="create-case-btn"
            onClick={() => window.location.hash = '#cases'}
          >
            Go to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-manager">
      {/* Header */}
      <div className="timeline-header">
        <div className="header-info">
          <h2>Case Timeline</h2>
          <p className="case-context">Timeline for: <strong>{currentCase.title}</strong></p>
        </div>
        <div className="header-actions">
          <button
            className="add-event-btn"
            onClick={() => setShowAddEvent(!showAddEvent)}
          >
            <span className="btn-icon">+</span>
            <span className="btn-text">Add Event</span>
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {showAddEvent && (
        <div className="add-event-form">
          <h3>Add Timeline Event</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="event-date">Date *</label>
              <input
                id="event-date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="event-time">Time</label>
              <input
                id="event-time"
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="event-type">Event Type</label>
              <select
                id="event-type"
                value={newEvent.type}
                onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                className="form-select"
              >
                <option value="general">General</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="filing">Filing</option>
                <option value="court">Court Date</option>
                <option value="communication">Communication</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="event-importance">Importance</label>
              <select
                id="event-importance"
                value={newEvent.importance}
                onChange={(e) => setNewEvent({...newEvent, importance: e.target.value})}
                className="form-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group full-width">
            <label htmlFor="event-title">Event Title *</label>
            <input
              id="event-title"
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              placeholder="e.g., Court hearing, Document deadline, Meeting with lawyer"
              className="form-input"
              required
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="event-description">Description</label>
            <textarea
              id="event-description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
              placeholder="Additional details about this event..."
              className="form-textarea"
              rows="3"
            />
          </div>
          <div className="form-actions">
            <button
              className="save-btn"
              onClick={handleAddEvent}
              disabled={!newEvent.date || !newEvent.title}
            >
              Save Event
            </button>
            <button
              className="cancel-btn"
              onClick={() => setShowAddEvent(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-content">
        {events.length === 0 ? (
          <div className="no-events">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Timeline Events</h3>
              <p>Start tracking important dates and milestones in your case.</p>
              <button
                className="add-first-event-btn"
                onClick={() => setShowAddEvent(true)}
              >
                Add First Event
              </button>
            </div>
          </div>
        ) : (
          <div className="timeline-events">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`timeline-event ${getImportanceClass(event.importance)}`}
              >
                <div className="event-marker">
                  <div className="event-icon">{getEventIcon(event.type)}</div>
                </div>
                <div className="event-content">
                  <div className="event-header">
                    <h4 className="event-title">{event.title}</h4>
                    <div className="event-meta">
                      <span className="event-date">{formatDate(event.timestamp)}</span>
                      {event.time && (
                        <span className="event-time">{formatTime(event.timestamp)}</span>
                      )}
                      <span className={`event-type type-${event.type}`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </span>
                    </div>
                  </div>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Stats */}
      {events.length > 0 && (
        <div className="timeline-stats">
          <div className="stat">
            <span className="stat-number">{events.length}</span>
            <span className="stat-label">Total Events</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {events.filter(e => e.importance === 'high' || e.importance === 'critical').length}
            </span>
            <span className="stat-label">High Priority</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {events.filter(e => new Date(e.timestamp) > new Date()).length}
            </span>
            <span className="stat-label">Upcoming</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineManager;