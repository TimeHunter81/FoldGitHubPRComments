const FOLDED_CLASS = 'fgpc-folded';
const HEADER_CONTROLS_CLASS = 'fgpc-page-controls';
const TOGGLE_BUTTON_CLASS = 'fgpc-toggle-button';

interface GroupState {
  button: HTMLButtonElement;
  folded: boolean;
  userModified: boolean;
}

const groupStates = new WeakMap<HTMLElement, GroupState>();
let foldByDefault = true;
let mutationObserver: MutationObserver | null = null;
let observedDiscussionContainer: Element | null = null;
let refreshScheduled = false;
let initialized = false;

function init(): void {
  if (initialized) {
    refresh();
    return;
  }

  initialized = true;
  injectStyles();
  refresh();
  setupGlobalListeners();
}

function setupGlobalListeners(): void {
  if (mutationObserver) {
    return;
  }

  mutationObserver = new MutationObserver(() => {
    scheduleRefresh();
  });

  ensureObserverTarget();

  document.addEventListener('pjax:end', scheduleRefresh);
  document.addEventListener('turbo:render', scheduleRefresh);
  document.addEventListener('pjax:beforeReplace', disconnectObserver);
  document.addEventListener('turbo:before-render', disconnectObserver);
  window.addEventListener('unload', disconnectObserver);
}

function refresh(): void {
  try {
    if (!isConversationPage()) {
      disconnectObserver();
      return;
    }

    ensureObserverTarget();
    insertHeaderControls();
    synchronizeGroups();
  } catch (error) {
    console.error('Fold GitHub PR Comments: refresh failed', error);
  }
}

function isConversationPage(): boolean {
  return document.querySelector('#discussion_bucket') !== null;
}

function insertHeaderControls(): void {
  const headerMeta = document.querySelector('.gh-header-meta');
  if (!headerMeta) {
    return;
  }

  let container = headerMeta.querySelector<HTMLElement>(`.${HEADER_CONTROLS_CLASS}`);
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
  } else {
    const checkbox = container.querySelector<HTMLInputElement>('#fgpc-fold-default');
    if (checkbox) {
      checkbox.checked = foldByDefault;
    }
  }
}

function createControlButton(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-link fgpc-control-button';
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', onClick);
  return button;
}

function setFoldByDefault(enabled: boolean): void {
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
  } else {
    groups.forEach(group => {
      setGroupFolded(group, false, true);
    });
  }
}

function foldAll(): void {
  getTimelineCommentGroups().forEach(group => setGroupFolded(group, true, true));
}

function unfoldAll(): void {
  getTimelineCommentGroups().forEach(group => setGroupFolded(group, false, true));
}

function synchronizeGroups(): void {
  const groups = getTimelineCommentGroups();
  groups.forEach(group => ensureGroupInitialized(group));
  applyDefaultFolding(groups);
}

function getTimelineCommentGroups(): HTMLElement[] {
  const container = document.querySelector('#discussion_bucket');
  if (!container) {
    return [];
  }

  // GitHub wraps top-level timeline threads with `.js-timeline-item` and nests
  // the actual comment content under `.timeline-comment-group`.
  const groups = Array.from(container.querySelectorAll<HTMLElement>('.js-timeline-item .timeline-comment-group'));
  return groups.filter(group => group.querySelector('.timeline-comment-header'));
}

function ensureGroupInitialized(group: HTMLElement): void {
  if (groupStates.has(group)) {
    return;
  }

  const header = group.querySelector<HTMLElement>('.timeline-comment-header');
  if (!header) {
    return;
  }

  const existingButton = header.querySelector<HTMLButtonElement>(`.${TOGGLE_BUTTON_CLASS}`);
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
  } else {
    header.appendChild(button);
  }

  groupStates.set(group, {
    button,
    folded: false,
    userModified: false
  });
}

function toggleGroupFold(group: HTMLElement): void {
  const state = groupStates.get(group);
  if (!state) {
    return;
  }
  setGroupFolded(group, !state.folded, true);
}

function setGroupFolded(group: HTMLElement, folded: boolean, userTriggered: boolean): void {
  const state = groupStates.get(group);
  if (!state) {
    return;
  }

  // Preserve the distinction between default folding and user intent so manual
  // toggles always win over subsequent refreshes.
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

function applyDefaultFolding(groups: HTMLElement[]): void {
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

function injectStyles(): void {
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

function scheduleRefresh(): void {
  if (refreshScheduled) {
    return;
  }

  refreshScheduled = true;
  requestAnimationFrame(() => {
    refreshScheduled = false;
    refresh();
  });
}

function ensureObserverTarget(): void {
  if (!mutationObserver) {
    return;
  }

  const discussionBucket = document.querySelector('#discussion_bucket');
  if (discussionBucket && discussionBucket !== observedDiscussionContainer) {
    mutationObserver.disconnect();
    mutationObserver.observe(discussionBucket, {
      childList: true,
      subtree: true
    });
    observedDiscussionContainer = discussionBucket;
  } else if (!discussionBucket && observedDiscussionContainer) {
    disconnectObserver();
  }
}

function disconnectObserver(): void {
  if (!mutationObserver || !observedDiscussionContainer) {
    observedDiscussionContainer = null;
    return;
  }

  mutationObserver.disconnect();
  observedDiscussionContainer = null;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
