import {
  createDefaultGroupEditValues,
  resetGroupTransformValues as resetGroupTransformValueState,
} from './panel_edit_state.js';
import { createTimelineSelectionState } from './timeline_state.js';

const DEFAULT_ACTION_SESSION_KEY = '__default_action__';

export function createActionEditSessionStore({ getActionKey }) {
  const sessions = new Map();

  function currentKey() {
    const key = getActionKey?.();
    return key ? String(key) : DEFAULT_ACTION_SESSION_KEY;
  }

  function sessionFor(key = currentKey()) {
    const sessionKey = key ? String(key) : DEFAULT_ACTION_SESSION_KEY;
    if (!sessions.has(sessionKey)) {
      sessions.set(sessionKey, createActionEditSession(sessionKey));
    }
    return sessions.get(sessionKey);
  }

  function currentSession() {
    return sessionFor(currentKey());
  }

  const timelineSelection = createTimelineSelectionProxy(currentSession);
  const selectedParts = createSelectedPartSetProxy(currentSession);

  return {
    timelineSelection,
    selectedParts,
    getActivePartKey: () => currentSession().activePartKey,
    setActivePartKey: (value) => {
      currentSession().activePartKey = value;
    },
    getGroupValues: () => currentSession().groupEditValues,
    setGroupValues: (nextValues) => {
      currentSession().groupEditValues = nextValues || createDefaultGroupEditValues();
    },
    createDefaultGroupValues: createDefaultGroupEditValues,
    resetGroupValues: () => {
      currentSession().groupEditValues = createDefaultGroupEditValues();
    },
    resetGroupTransformValues: () => {
      resetGroupTransformValueState(currentSession().groupEditValues);
    },
    resetCurrentSession: () => {
      sessions.set(currentKey(), createActionEditSession(currentKey()));
    },
    resetAllSessions: () => {
      sessions.clear();
    },
    ensureSession: () => currentSession(),
  };
}

function createActionEditSession(key) {
  return {
    key,
    timelineSelection: createTimelineSelectionState(),
    selectedPartKeys: new Set(),
    activePartKey: null,
    groupEditValues: createDefaultGroupEditValues(),
  };
}

function createTimelineSelectionProxy(getSession) {
  const proxy = {};
  ['activeKeyframeId', 'fixedFrame', 'selectedSlot'].forEach((prop) => {
    Object.defineProperty(proxy, prop, {
      enumerable: true,
      get: () => getSession().timelineSelection[prop],
      set: (value) => {
        getSession().timelineSelection[prop] = value;
      },
    });
  });
  return proxy;
}

function createSelectedPartSetProxy(getSession) {
  function parts() {
    return getSession().selectedPartKeys;
  }

  return {
    clear: () => parts().clear(),
    toggle: (partKey) => {
      if (parts().has(partKey)) {
        parts().delete(partKey);
        return false;
      }
      parts().add(partKey);
      return true;
    },
    selectOnly: (partKey) => {
      parts().clear();
      if (partKey) parts().add(partKey);
      return partKey || null;
    },
    has: (partKey) => parts().has(partKey),
    size: () => parts().size,
    values: () => Array.from(parts()),
    forEach: (callback) => parts().forEach(callback),
  };
}
