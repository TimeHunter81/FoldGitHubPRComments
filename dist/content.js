const FOLDED_CLASS = 'fgpc-folded';
const HEADER_CONTROLS_CLASS = 'fgpc-page-controls';
const TOGGLE_BUTTON_CLASS = 'fgpc-toggle-button';
const groupStates = new WeakMap();
let foldByDefault = true;
let mutationObserver = null;
let initialized = false;
function init() {
  if (initialized) {
    refresh();
    return;
  }
  initialized = true;
  injectStyles();
  refresh();
  setupGlobalListeners();
}
function setupGlobalListeners() {
  if (mutationObserver) {
    return;
  }
  mutationObserver = new MutationObserver(() => {
    refresh();
  });
  if (document.body) {
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  document.addEventListener('pjax:end', refresh);
  document.addEventListener('turbo:render', refresh);
}
function refresh() {
  if (!isConversationPage()) {
    return;
  }
  insertHeaderControls();
  synchronizeGroups();
}
function isConversationPage() {
  return document.querySelector('#discussion_bucket') !== null;
}
function insertHeaderControls() {
  const headerMeta = document.querySelector('.gh-header-meta');
  if (!headerMeta) {
    return;
  }
  let container = headerMeta.querySelector(`.${HEADER_CONTROLS_CLASS}`);
  if (!container) {
    container = document.createElement('span');
    container.className = `${HEADER_CONTROLS_CLASS} d-inline-flex flex-items-center flex-wrap gap-2 ml-2`;
    const defaultLabel = document.createElement('label');
    defaultLabel.className = 'd-inline-flex flex-items-center gap-1 fgpc-default-toggle';
    const defaultCheckbox = document.createElement('input');
    defaultCheckbox.type = 'checkbox';
    defaultCheckbox.id = 'fgpc-fold-default';
    defaultCheckbox.checked = foldByDefault;
    defaultCheckbox.addEventListener('change', () => {
      setFoldByDefault(defaultCheckbox.checked);
    });
    const labelText = document.createElement('span');
    labelText.textContent = 'Fold older comments';
    defaultLabel.append(defaultCheckbox, labelText);
    const foldAllButton = createControlButton('Fold all', 'Fold every top-level comment in the conversation', () => {
      foldAll();
    });
    const unfoldAllButton = createControlButton('Unfold all', 'Unfold every top-level comment in the conversation', () => {
      unfoldAll();
    });
    container.append(defaultLabel, foldAllButton, unfoldAllButton);
    headerMeta.appendChild(container);
  }
  else {
    const checkbox = container.querySelector('#fgpc-fold-default');
    if (checkbox) {
      checkbox.checked = foldByDefault;
    }
  }
}
function createControlButton(label, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-link fgpc-control-button';
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', onClick);
  return button;
}
function setFoldByDefault(enabled) {
  foldByDefault = enabled;
  const groups = getTimelineCommentGroups();
  if (enabled) {
    groups.forEach(group => {
      const state = groupStates.get(group);
      if (state) {
        state.userModified = false;
      }
    });
    applyDefaultFolding(groups);
  }
  else {
    groups.forEach(group => {
      setGroupFolded(group, false, true);
    });
  }
}
function foldAll() {
  getTimelineCommentGroups().forEach(group => setGroupFolded(group, true, true));
}
function unfoldAll() {
  getTimelineCommentGroups().forEach(group => setGroupFolded(group, false, true));
}
function synchronizeGroups() {
  const groups = getTimelineCommentGroups();
  groups.forEach(group => ensureGroupInitialized(group));
  applyDefaultFolding(groups);
}
function getTimelineCommentGroups() {
  const container = document.querySelector('#discussion_bucket');
  if (!container) {
    return [];
  }
  const groups = Array.from(container.querySelectorAll('.js-timeline-item .timeline-comment-group'));
  return groups.filter(group => group.querySelector('.timeline-comment-header'));
}
function ensureGroupInitialized(group) {
  if (groupStates.has(group)) {
    return;
  }
  const header = group.querySelector('.timeline-comment-header');
  if (!header) {
    return;
  }
  const existingButton = header.querySelector(`.${TOGGLE_BUTTON_CLASS}`);
  if (existingButton) {
    groupStates.set(group, {
      button: existingButton,
      folded: group.classList.contains(FOLDED_CLASS),
      userModified: false
    });
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn-link ${TOGGLE_BUTTON_CLASS}`;
  button.textContent = 'Fold';
  button.setAttribute('aria-expanded', 'true');
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleGroupFold(group);
  });
  const actions = header.querySelector('.timeline-comment-actions');
  if (actions) {
    actions.prepend(button);
  }
  else {
    header.appendChild(button);
  }
  groupStates.set(group, {
    button,
    folded: false,
    userModified: false
  });
}
function toggleGroupFold(group) {
  const state = groupStates.get(group);
  if (!state) {
    return;
  }
  setGroupFolded(group, !state.folded, true);
}
function setGroupFolded(group, folded, userTriggered) {
  const state = groupStates.get(group);
  if (!state) {
    return;
  }
  if (state.folded === folded && !(userTriggered && !state.userModified)) {
    if (userTriggered) {
      state.userModified = true;
    }
    return;
  }
  group.classList.toggle(FOLDED_CLASS, folded);
  state.folded = folded;
  state.button.textContent = folded ? 'Unfold' : 'Fold';
  state.button.setAttribute('aria-expanded', String(!folded));
  if (userTriggered) {
    state.userModified = true;
  }
}
function applyDefaultFolding(groups) {
  if (!foldByDefault || groups.length === 0) {
    return;
  }
  const lastGroup = groups[groups.length - 1];
  groups.forEach(group => {
    const state = groupStates.get(group);
    if (!state || state.userModified) {
      return;
    }
    const shouldFold = group !== lastGroup;
    group.classList.toggle(FOLDED_CLASS, shouldFold);
    state.folded = shouldFold;
    state.button.textContent = shouldFold ? 'Unfold' : 'Fold';
    state.button.setAttribute('aria-expanded', String(!shouldFold));
  });
}
function injectStyles() {
  if (document.head.querySelector('style[data-fgpc]')) {
    return;
  }
  const style = document.createElement('style');
  style.dataset.fgpc = 'true';
  style.textContent = `
    .${HEADER_CONTROLS_CLASS} {
      font-size: 12px;
      gap: 0.5rem;
    }

    .${HEADER_CONTROLS_CLASS} .fgpc-control-button {
      padding: 0;
    }

    .${HEADER_CONTROLS_CLASS} .fgpc-control-button,
    .${HEADER_CONTROLS_CLASS} .fgpc-control-button:focus,
    .${HEADER_CONTROLS_CLASS} .fgpc-control-button:hover {
      text-decoration: underline;
    }

    .${HEADER_CONTROLS_CLASS} input[type="checkbox"] {
      margin: 0;
    }

    .${TOGGLE_BUTTON_CLASS} {
      margin-right: 8px;
    }

    .${TOGGLE_BUTTON_CLASS}:focus {
      outline: none;
      text-decoration: underline;
    }

    .timeline-comment-group.${FOLDED_CLASS} > :not(.timeline-comment-header) {
      display: none !important;
    }

    .timeline-comment-group.${FOLDED_CLASS} .timeline-comment-header {
      border-bottom: none;
    }
  `;
  document.head.appendChild(style);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
}
else {
  init();
}
