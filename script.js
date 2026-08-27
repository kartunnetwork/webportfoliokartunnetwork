const desktop = document.querySelector('#desktop');
const icons = [...document.querySelectorAll('.desktop-icon')];
let drag = null;
const undoStack = [];
const recycleEntries = [];
let recycleSequence = 0;
const trash = document.querySelector('.recycle-bin');
let desktopSize = { width: desktop.clientWidth, height: desktop.clientHeight };

icons.forEach(icon => {
  const x = Number(icon.dataset.x);
  const y = Number(icon.dataset.y);
  icon.style.left = `${Math.min(desktop.clientWidth - 50, x / 1400 * desktop.clientWidth)}px`;
  icon.style.top = `${Math.min(desktop.clientHeight - 82, y / 705 * desktop.clientHeight)}px`;
});
ensureTopFolderSpacing();

function ensureTopFolderSpacing() {
  const logos = document.querySelector('[data-app="logos-folder"]');
  const wedding = document.querySelector('[data-app="wedding-folder"]');
  if (!logos || !wedding) return;
  const logosLeft = parseFloat(logos.style.left) || 0;
  const weddingLeft = parseFloat(wedding.style.left) || 0;
  const logosTop = parseFloat(logos.style.top) || 0;
  const weddingTop = parseFloat(wedding.style.top) || 0;
  if (Math.abs(logosTop - weddingTop) >= 50 || Math.abs(logosLeft - weddingLeft) >= 68) return;
  const rightPosition = logosLeft + 68;
  if (rightPosition <= desktop.clientWidth - 50) wedding.style.left = `${rightPosition}px`;
  else logos.style.left = `${Math.max(0, weddingLeft - 68)}px`;
}

function openDesktopApp(icon) {
  if (icon.dataset.app === 'minesweeper') openMinesweeper();
  if (icon.dataset.app === 'meme') openMemeViewer();
  if (icon.dataset.app === 'wedding-folder') openWeddingFolder();
  if (icon.dataset.app === 'recycle') openRecycleBin();
  if (icon.dataset.app === 'logos-folder') openLogosFolder();
  if (icon.dataset.app === 'meme2') openMeme2Viewer();
  if (icon.dataset.app === 'misc-folder') openMiscFolder();
  if (icon.dataset.app === 'mail-menu') toggleMailMenu(icon);
}

function selectIcon(icon) {
  icons.forEach(item => item.classList.toggle('selected', item === icon));
}

icons.forEach(icon => {
  icon.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    selectIcon(icon);
    const rect = icon.getBoundingClientRect();
    drag = { icon, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
    icon.setPointerCapture(event.pointerId);
  });

  icon.addEventListener('pointermove', event => {
    if (!drag || drag.icon !== icon) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    icon.classList.add('dragging');
    icon.style.left = `${Math.max(0, Math.min(desktop.clientWidth - 50, drag.left + dx))}px`;
    icon.style.top = `${Math.max(0, Math.min(desktop.clientHeight - 82, drag.top + dy))}px`;
    if (icon !== trash) icon.classList.toggle('over-trash', overlaps(icon, trash));
  });

  icon.addEventListener('pointerup', event => {
    if (!drag || drag.icon !== icon) return;
    const wasMoved = drag.moved;
    const shouldOpen = !drag.moved && icon.matches('a.external');
    const shouldTrash = drag.moved && icon !== trash && overlaps(icon, trash);
    icon.classList.remove('dragging');
    icon.classList.remove('over-trash');
    if (shouldTrash) {
      const entry = { id: ++recycleSequence, type: 'desktop', icon, left: drag.left, top: drag.top, name: icon.dataset.name, imgSrc: icon.querySelector('img')?.src };
      undoStack.push(entry);
      recycleEntries.push(entry);
      icon.classList.add('trashed');
      renderRecycleBin();
      showToast(`${icon.dataset.name} перемещён в корзину · Ctrl+Z — вернуть`);
    }
    drag = null;
    if (shouldOpen) {
      if (icon.href.startsWith('mailto:')) window.location.href = icon.href;
      else window.open(icon.href, '_blank', 'noopener');
    }
    if (!wasMoved && icon.dataset.app === 'mail-menu') openDesktopApp(icon);
    else if (!wasMoved && event.pointerType !== 'mouse' && icon.dataset.app) openDesktopApp(icon);
  });

  icon.addEventListener('click', event => event.preventDefault());
  icon.addEventListener('keydown', event => {
    if (event.key === 'Enter' && icon.matches('a.external')) {
      if (icon.href.startsWith('mailto:')) window.location.href = icon.href;
      else window.open(icon.href, '_blank', 'noopener');
    }
  });
  icon.addEventListener('dblclick', () => { if (icon.dataset.app !== 'mail-menu') openDesktopApp(icon); });
});

function overlaps(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return ar.left < br.right && ar.right > br.left && ar.top < br.bottom && ar.bottom > br.top;
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    if (miscUndo.length) {
      const action = miscUndo.pop();
      event.preventDefault();
      restoreRecycleEntry(action);
      return;
    }
    if (logosUndo.length) {
      const action = logosUndo.pop();
      event.preventDefault();
      restoreRecycleEntry(action);
      return;
    }
    if (folderUndo.length) {
      const action = folderUndo.pop();
      event.preventDefault();
      restoreRecycleEntry(action);
      return;
    }
    const action = undoStack.pop();
    if (!action) return;
    event.preventDefault();
    restoreRecycleEntry(action);
  }
});

window.addEventListener('resize', () => {
  const next = { width: desktop.clientWidth, height: desktop.clientHeight };
  icons.filter(icon => !icon.classList.contains('trashed')).forEach(icon => {
    icon.style.left = `${Math.min(next.width - 50, parseFloat(icon.style.left) / desktopSize.width * next.width)}px`;
    icon.style.top = `${Math.min(next.height - 82, parseFloat(icon.style.top) / desktopSize.height * next.height)}px`;
  });
  ensureTopFolderSpacing();
  desktopSize = next;
});

desktop.addEventListener('pointerdown', event => {
  if (event.target === desktop) selectIcon(null);
});

const startButton = document.querySelector('.start-button');
startButton.addEventListener('click', () => startButton.classList.toggle('active'));

const mailChoiceMenu = document.querySelector('#mail-choice-menu');
const contactEmail = 'dariakart9@gmail.com';
function toggleMailMenu(icon) {
  const shouldOpen = mailChoiceMenu.hidden;
  mailChoiceMenu.hidden = !shouldOpen;
  if (!shouldOpen) return;
  const rect = icon.getBoundingClientRect();
  mailChoiceMenu.style.left = `${Math.max(4, Math.min(rect.left, desktop.clientWidth - 200))}px`;
  mailChoiceMenu.style.top = `${Math.max(4, Math.min(rect.bottom + 4, desktop.clientHeight - 112))}px`;
}
mailChoiceMenu.addEventListener('click', async event => {
  const action = event.target.closest('button')?.dataset.mailAction;
  if (!action) return;
  if (action === 'app') window.location.href = `mailto:${contactEmail}`;
  if (action === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactEmail)}`, '_blank', 'noopener');
  if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(contactEmail);
      showToast(`Адрес ${contactEmail} скопирован`);
    } catch {
      showToast(`Почта: ${contactEmail}`);
    }
  }
  mailChoiceMenu.hidden = true;
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#mail-choice-menu') && !event.target.closest('[data-app="mail-menu"]')) mailChoiceMenu.hidden = true;
});

const imageWindow = document.querySelector('#image-window');
const memeTask = document.querySelector('#meme-task');
function openMemeViewer() {
  imageWindow.hidden = false;
  memeTask.hidden = false;
  fitWindowToDesktop(imageWindow);
}
function closeMemeViewer() { imageWindow.hidden = true; memeTask.hidden = true; }
document.querySelector('.image-close').addEventListener('click', closeMemeViewer);
memeTask.addEventListener('click', () => { imageWindow.hidden = !imageWindow.hidden; });

const meme2Window = document.querySelector('#meme2-window');
const meme2Task = document.querySelector('#meme2-task');
function openMeme2Viewer() { meme2Window.hidden = false; meme2Task.hidden = false; fitWindowToDesktop(meme2Window); }
function closeMeme2Viewer() { meme2Window.hidden = true; meme2Task.hidden = true; }
document.querySelector('.meme2-close').addEventListener('click', closeMeme2Viewer);
meme2Task.addEventListener('click', () => { meme2Window.hidden = !meme2Window.hidden; });

const bannerWindow = document.querySelector('#banner-window');
const bannerTask = document.querySelector('#banner-task');
function openBannerViewer() { bannerWindow.hidden = false; bannerTask.hidden = false; fitWindowToDesktop(bannerWindow); }
function closeBannerViewer() { bannerWindow.hidden = true; bannerTask.hidden = true; }
document.querySelector('.banner-close').addEventListener('click', closeBannerViewer);
bannerTask.addEventListener('click', () => { bannerWindow.hidden = !bannerWindow.hidden; });

const folderWindow = document.querySelector('#folder-window');
const folderTask = document.querySelector('#folder-task');
const folderBoard = document.querySelector('#folder-whiteboard');
const folderUndo = [];
function openWeddingFolder() { folderWindow.hidden = false; folderTask.hidden = false; fitWindowToDesktop(folderWindow); }
function closeWeddingFolder() { folderWindow.hidden = true; folderTask.hidden = true; }
document.querySelector('.folder-close').addEventListener('click', closeWeddingFolder);
folderTask.addEventListener('click', () => { folderWindow.hidden = !folderWindow.hidden; });
function updateFolderStatus() { document.querySelector('#folder-status').textContent = `${folderBoard.children.length} объект(а)`; }

folderBoard.addEventListener('pointerdown', event => {
  const item = event.target.closest('.folder-item');
  folderBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === item));
});
folderBoard.addEventListener('dblclick', event => {
  const item = event.target.closest('.folder-item[data-url]');
  if (item) window.open(item.dataset.url, '_blank', 'noopener,noreferrer');
});
folderBoard.querySelectorAll('.folder-item').forEach(item => {
  let itemDrag = null;
  item.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    itemDrag = { x: event.clientX, y: event.clientY, moved: false, ghost: null };
    item.setPointerCapture(event.pointerId);
  });
  item.addEventListener('pointermove', event => {
    if (!itemDrag) return;
    if (Math.abs(event.clientX - itemDrag.x) + Math.abs(event.clientY - itemDrag.y) > 4) itemDrag.moved = true;
    item.classList.toggle('folder-dragging', itemDrag.moved);
    if (itemDrag.moved) {
      if (!itemDrag.ghost) {
        itemDrag.ghost = item.cloneNode(true);
        itemDrag.ghost.classList.remove('folder-dragging');
        itemDrag.ghost.classList.add('drag-ghost', 'selected');
        itemDrag.ghost.removeAttribute('id');
        desktop.append(itemDrag.ghost);
      }
      itemDrag.ghost.style.transform = `translate(${event.clientX + 8}px, ${event.clientY + 8}px)`;
      item.style.pointerEvents = 'none';
      const under = document.elementFromPoint(event.clientX, event.clientY);
      item.style.pointerEvents = '';
      trash.classList.toggle('folder-drop-target', Boolean(under?.closest('.recycle-bin')));
    }
  });
  item.addEventListener('pointerup', event => {
    if (!itemDrag) return;
    item.style.pointerEvents = 'none';
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const target = under?.closest('.folder-item');
    const droppedOnDesktopTrash = Boolean(under?.closest('.recycle-bin'));
    item.style.pointerEvents = '';
    trash.classList.remove('folder-drop-target');
    item.classList.remove('folder-dragging');
    itemDrag.ghost?.remove();
    if (itemDrag.moved && droppedOnDesktopTrash) {
      const visibleItems = [...folderBoard.children];
      const entry = { id: ++recycleSequence, type: 'folder', item, index: visibleItems.indexOf(item), name: item.dataset.folderName, imgSrc: item.querySelector('img')?.src };
      folderUndo.push(entry);
      recycleEntries.push(entry);
      item.remove();
      updateFolderStatus();
      renderRecycleBin();
      showToast(`${item.dataset.folderName} перемещён в корзину · Ctrl+Z — вернуть`);
    } else if (itemDrag.moved && target && target !== item) {
      const marker = document.createComment('swap');
      item.replaceWith(marker); target.replaceWith(item); marker.replaceWith(target);
    }
    itemDrag = null;
  });
  item.addEventListener('pointercancel', () => {
    item.classList.remove('folder-dragging');
    trash.classList.remove('folder-drop-target');
    itemDrag?.ghost?.remove();
    itemDrag = null;
  });
});

const recycleWindow = document.querySelector('#recycle-window');
const recycleTask = document.querySelector('#recycle-task');
const recycleBoard = document.querySelector('#recycle-whiteboard');
const recycleContext = document.querySelector('#recycle-context');
let recycleSelection = null;
let copiedRecycleEntry = null;

const logosWindow = document.querySelector('#logos-window');
const logosTask = document.querySelector('#logos-task');
const logosBoard = document.querySelector('#logos-whiteboard');
const logosUndo = [];
function openLogosFolder() { logosWindow.hidden = false; logosTask.hidden = false; fitWindowToDesktop(logosWindow); }
function closeLogosFolder() { logosWindow.hidden = true; logosTask.hidden = true; }
document.querySelector('.logos-close').addEventListener('click', closeLogosFolder);
logosTask.addEventListener('click', () => { logosWindow.hidden = !logosWindow.hidden; });
function updateLogosStatus() { document.querySelector('#logos-status').textContent = `${logosBoard.children.length} объект(а)`; }

logosBoard.addEventListener('pointerdown', event => {
  const selected = event.target.closest('.folder-item');
  logosBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === selected));
});
logosBoard.addEventListener('dblclick', event => {
  const item = event.target.closest('.folder-item[data-url]');
  if (item) window.open(item.dataset.url, '_blank', 'noopener,noreferrer');
});
logosBoard.querySelectorAll('.folder-item').forEach(item => {
  let logoDrag = null;
  item.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    logoDrag = { x: event.clientX, y: event.clientY, moved: false, ghost: null };
    item.setPointerCapture(event.pointerId);
  });
  item.addEventListener('pointermove', event => {
    if (!logoDrag) return;
    if (Math.abs(event.clientX - logoDrag.x) + Math.abs(event.clientY - logoDrag.y) > 4) logoDrag.moved = true;
    item.classList.toggle('folder-dragging', logoDrag.moved);
    if (!logoDrag.moved) return;
    if (!logoDrag.ghost) {
      logoDrag.ghost = item.cloneNode(true); logoDrag.ghost.classList.remove('folder-dragging'); logoDrag.ghost.classList.add('drag-ghost', 'selected'); desktop.append(logoDrag.ghost);
    }
    logoDrag.ghost.style.transform = `translate(${event.clientX + 8}px, ${event.clientY + 8}px)`;
    item.style.pointerEvents = 'none'; const under = document.elementFromPoint(event.clientX, event.clientY); item.style.pointerEvents = '';
    trash.classList.toggle('folder-drop-target', Boolean(under?.closest('.recycle-bin')));
  });
  item.addEventListener('pointerup', event => {
    if (!logoDrag) return;
    item.style.pointerEvents = 'none'; const under = document.elementFromPoint(event.clientX, event.clientY); item.style.pointerEvents = '';
    const target = under?.closest('.folder-item'); const onTrash = Boolean(under?.closest('.recycle-bin'));
    trash.classList.remove('folder-drop-target'); item.classList.remove('folder-dragging'); logoDrag.ghost?.remove();
    if (logoDrag.moved && onTrash) {
      const entry = { id: ++recycleSequence, type: 'logos', item, index: [...logosBoard.children].indexOf(item), name: item.dataset.folderName, imgSrc: item.querySelector('img')?.src };
      logosUndo.push(entry); recycleEntries.push(entry); item.remove(); updateLogosStatus(); renderRecycleBin(); showToast(`${entry.name} перемещён в корзину · Ctrl+Z — вернуть`);
    } else if (logoDrag.moved && target && target !== item && target.closest('#logos-whiteboard')) {
      const marker = document.createComment('swap'); item.replaceWith(marker); target.replaceWith(item); marker.replaceWith(target);
    }
    logoDrag = null;
  });
  item.addEventListener('pointercancel', () => { item.classList.remove('folder-dragging'); trash.classList.remove('folder-drop-target'); logoDrag?.ghost?.remove(); logoDrag = null; });
});

const miscWindow = document.querySelector('#misc-window');
const miscTask = document.querySelector('#misc-task');
const miscBoard = document.querySelector('#misc-whiteboard');
const miscUndo = [];
function openMiscFolder() { miscWindow.hidden = false; miscTask.hidden = false; fitWindowToDesktop(miscWindow); }
function closeMiscFolder() { miscWindow.hidden = true; miscTask.hidden = true; }
document.querySelector('.misc-close').addEventListener('click', closeMiscFolder);
miscTask.addEventListener('click', () => { miscWindow.hidden = !miscWindow.hidden; });

miscBoard.addEventListener('pointerdown', event => {
  const selected = event.target.closest('.folder-item');
  miscBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === selected));
});
miscBoard.addEventListener('dblclick', event => {
  const item = event.target.closest('.folder-item');
  if (item?.dataset.url) window.open(item.dataset.url, '_blank', 'noopener,noreferrer');
  if (item?.dataset.app === 'banner-viewer') openBannerViewer();
});
miscBoard.querySelectorAll('.folder-item').forEach(item => {
  let miscDrag = null;
  item.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    miscDrag = { x: event.clientX, y: event.clientY, moved: false, ghost: null };
    item.setPointerCapture(event.pointerId);
  });
  item.addEventListener('pointermove', event => {
    if (!miscDrag) return;
    if (Math.abs(event.clientX - miscDrag.x) + Math.abs(event.clientY - miscDrag.y) > 4) miscDrag.moved = true;
    item.classList.toggle('folder-dragging', miscDrag.moved);
    if (!miscDrag.moved) return;
    if (!miscDrag.ghost) {
      miscDrag.ghost = item.cloneNode(true); miscDrag.ghost.classList.remove('folder-dragging'); miscDrag.ghost.classList.add('drag-ghost', 'selected'); desktop.append(miscDrag.ghost);
    }
    miscDrag.ghost.style.transform = `translate(${event.clientX + 8}px, ${event.clientY + 8}px)`;
    item.style.pointerEvents = 'none'; const under = document.elementFromPoint(event.clientX, event.clientY); item.style.pointerEvents = '';
    trash.classList.toggle('folder-drop-target', Boolean(under?.closest('.recycle-bin')));
  });
  item.addEventListener('pointerup', event => {
    if (!miscDrag) return;
    item.style.pointerEvents = 'none'; const under = document.elementFromPoint(event.clientX, event.clientY); item.style.pointerEvents = '';
    const target = under?.closest('.folder-item'); const onTrash = Boolean(under?.closest('.recycle-bin'));
    trash.classList.remove('folder-drop-target'); item.classList.remove('folder-dragging'); miscDrag.ghost?.remove();
    if (miscDrag.moved && onTrash) {
      const entry = { id: ++recycleSequence, type: 'misc', item, index: [...miscBoard.children].indexOf(item), name: item.dataset.folderName, imgSrc: item.querySelector('img')?.src };
      miscUndo.push(entry); recycleEntries.push(entry); item.remove(); renderRecycleBin(); showToast(`${entry.name} перемещён в корзину · Ctrl+Z — вернуть`);
    } else if (miscDrag.moved && target && target !== item && target.closest('#misc-whiteboard')) {
      const marker = document.createComment('swap'); item.replaceWith(marker); target.replaceWith(item); marker.replaceWith(target);
    }
    miscDrag = null;
  });
  item.addEventListener('pointercancel', () => { item.classList.remove('folder-dragging'); trash.classList.remove('folder-drop-target'); miscDrag?.ghost?.remove(); miscDrag = null; });
});

function openRecycleBin() { recycleWindow.hidden = false; recycleTask.hidden = false; renderRecycleBin(); fitWindowToDesktop(recycleWindow); }
function closeRecycleBin() { recycleWindow.hidden = true; recycleTask.hidden = true; recycleContext.hidden = true; }
document.querySelector('.recycle-close').addEventListener('click', closeRecycleBin);
recycleTask.addEventListener('click', () => { recycleWindow.hidden = !recycleWindow.hidden; recycleContext.hidden = true; });

function renderRecycleBin() {
  recycleBoard.replaceChildren();
  if (!recycleEntries.length) {
    const empty = document.createElement('p'); empty.className = 'recycle-empty'; empty.textContent = 'Корзина пуста.'; recycleBoard.append(empty);
  } else {
    recycleEntries.forEach(entry => {
      const button = document.createElement('button');
      button.className = 'recycle-item'; button.type = 'button'; button.dataset.recycleId = entry.id;
      const img = document.createElement('img'); img.src = entry.imgSrc || 'assets/folder.png'; img.alt = '';
      const label = document.createElement('span'); label.textContent = entry.name;
      button.append(img, label); recycleBoard.append(button);
    });
  }
  document.querySelector('#recycle-status').textContent = `${recycleEntries.length} объект(а)`;
  recycleSelection = recycleEntries.find(entry => entry.id === recycleSelection?.id) || null;
}

function selectRecycleItem(button) {
  recycleBoard.querySelectorAll('.recycle-item').forEach(item => item.classList.toggle('selected', item === button));
  recycleSelection = recycleEntries.find(entry => entry.id === Number(button?.dataset.recycleId)) || null;
}
recycleBoard.addEventListener('click', event => selectRecycleItem(event.target.closest('.recycle-item')));
recycleBoard.addEventListener('dblclick', event => {
  const item = event.target.closest('.recycle-item'); if (!item) return; selectRecycleItem(item); showToast(`${recycleSelection.name}: предварительный просмотр недоступен`);
});
recycleBoard.addEventListener('contextmenu', event => {
  const item = event.target.closest('.recycle-item'); if (!item) return;
  event.preventDefault(); selectRecycleItem(item);
  recycleContext.hidden = false;
  recycleContext.style.left = `${Math.min(event.clientX, desktop.clientWidth - 132)}px`;
  recycleContext.style.top = `${Math.min(event.clientY, desktop.clientHeight - 100)}px`;
});
document.addEventListener('pointerdown', event => { if (!event.target.closest('#recycle-context')) recycleContext.hidden = true; });
recycleContext.addEventListener('click', event => {
  const command = event.target.closest('button')?.dataset.command; if (!command || !recycleSelection) return;
  if (command === 'open') showToast(`${recycleSelection.name}: предварительный просмотр недоступен`);
  if (command === 'copy') { copiedRecycleEntry = recycleSelection; showToast(`${recycleSelection.name} скопирован`); }
  if (command === 'restore') restoreRecycleEntry(recycleSelection);
  recycleContext.hidden = true;
});

function restoreRecycleEntry(entry) {
  if (!entry) return;
  if (entry.type === 'folder') {
    folderBoard.insertBefore(entry.item, folderBoard.children[entry.index] || null);
    folderBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === entry.item));
    updateFolderStatus();
  } else if (entry.type === 'logos') {
    logosBoard.insertBefore(entry.item, logosBoard.children[entry.index] || null);
    logosBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === entry.item));
    updateLogosStatus();
  } else if (entry.type === 'misc') {
    miscBoard.insertBefore(entry.item, miscBoard.children[entry.index] || null);
    miscBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === entry.item));
  } else {
    entry.icon.style.left = `${Math.min(desktop.clientWidth - 50, entry.left)}px`;
    entry.icon.style.top = `${Math.min(desktop.clientHeight - 82, entry.top)}px`;
    entry.icon.classList.remove('trashed');
    selectIcon(entry.icon);
  }
  const recycleIndex = recycleEntries.indexOf(entry); if (recycleIndex >= 0) recycleEntries.splice(recycleIndex, 1);
  const folderIndex = folderUndo.indexOf(entry); if (folderIndex >= 0) folderUndo.splice(folderIndex, 1);
  const logosIndex = logosUndo.indexOf(entry); if (logosIndex >= 0) logosUndo.splice(logosIndex, 1);
  const miscIndex = miscUndo.indexOf(entry); if (miscIndex >= 0) miscUndo.splice(miscIndex, 1);
  const desktopIndex = undoStack.indexOf(entry); if (desktopIndex >= 0) undoStack.splice(desktopIndex, 1);
  renderRecycleBin();
  showToast(`${entry.name} восстановлен`);
}

function fitWindowToDesktop(win) {
  const workWidth = desktop.clientWidth;
  const workHeight = desktop.clientHeight - 32;
  const rect = win.getBoundingClientRect();
  const width = Math.min(rect.width, workWidth - 8);
  const height = Math.min(rect.height, workHeight - 8);
  win.style.transform = 'none';
  win.style.width = `${width}px`;
  win.style.height = `${height}px`;
  win.style.left = `${Math.max(4, (workWidth - width) / 2)}px`;
  win.style.top = `${Math.max(4, (workHeight - height) / 2)}px`;
}

document.querySelectorAll('.window:not(.mines-window)').forEach(win => {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.setAttribute('aria-hidden', 'true');
  win.append(handle);
  let resizeState = null;
  handle.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    const rect = win.getBoundingClientRect();
    win.style.transform = 'none';
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;
    win.style.width = `${rect.width}px`;
    win.style.height = `${rect.height}px`;
    resizeState = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!resizeState) return;
    const left = parseFloat(win.style.left);
    const top = parseFloat(win.style.top);
    const maxWidth = desktop.clientWidth - left - 4;
    const maxHeight = desktop.clientHeight - 32 - top - 4;
    const minWidth = Math.min(240, maxWidth);
    const minHeight = Math.min(180, maxHeight);
    win.style.width = `${Math.max(minWidth, Math.min(maxWidth, resizeState.width + event.clientX - resizeState.x))}px`;
    win.style.height = `${Math.max(minHeight, Math.min(maxHeight, resizeState.height + event.clientY - resizeState.y))}px`;
  });
  handle.addEventListener('pointerup', () => { resizeState = null; });
});
window.addEventListener('resize', () => { if (!imageWindow.hidden) fitWindowToDesktop(imageWindow); });

const minesWindow = document.querySelector('#mines-window');
const mineTask = document.querySelector('#mine-task');
const mineBoard = document.querySelector('#mine-board');
const mineReset = document.querySelector('#mine-reset');
let mineTimer = null;
let seconds = 0;
let mineState = [];
let firstMove = true;
let currentLevel = 'beginner';
const levels = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 }
};

function openMinesweeper() {
  minesWindow.hidden = false;
  mineTask.hidden = false;
  newMineGame();
}
function closeMinesweeper() { minesWindow.hidden = true; mineTask.hidden = true; clearInterval(mineTimer); }
document.querySelector('.window-close').addEventListener('click', closeMinesweeper);
mineTask.addEventListener('click', () => { minesWindow.hidden = !minesWindow.hidden; });
mineReset.addEventListener('click', newMineGame);

const gameMenu = document.querySelector('#game-menu');
const gameTrigger = document.querySelector('#game-menu-trigger');
gameTrigger.addEventListener('click', event => {
  event.stopPropagation();
  gameMenu.hidden = !gameMenu.hidden;
  gameTrigger.classList.toggle('active', !gameMenu.hidden);
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.window-menu')) closeGameMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'F2') { event.preventDefault(); newMineGame(); }
});
gameMenu.addEventListener('click', event => {
  const item = event.target.closest('button:not(:disabled)');
  if (!item) return;
  if (item.dataset.level) currentLevel = item.dataset.level;
  updateLevelChecks();
  newMineGame();
  closeGameMenu();
});
function closeGameMenu() { gameMenu.hidden = true; gameTrigger.classList.remove('active'); }
function updateLevelChecks() {
  gameMenu.querySelectorAll('[data-level]').forEach(item => {
    item.querySelector('.menu-check').textContent = item.dataset.level === currentLevel ? '✓' : '';
  });
}

function newMineGame() {
  const config = levels[currentLevel];
  clearInterval(mineTimer); seconds = 0; document.querySelector('#mine-time').textContent = '000';
  mineTimer = null; firstMove = true; mineReset.dataset.face = 'normal';
  mineState = Array.from({length:config.rows * config.cols}, () => ({mine:false, open:false, flag:false}));
  mineBoard.style.gridTemplateColumns = `repeat(${config.cols}, 22px)`;
  minesWindow.style.width = `${config.cols * 22 + 22}px`;
  mineBoard.replaceChildren(...mineState.map((cell, i) => {
    const button = document.createElement('button'); button.className = 'mine-cell'; button.type = 'button'; button.dataset.i = i;
    button.addEventListener('click', () => openCell(i));
    button.addEventListener('contextmenu', e => { e.preventDefault(); if (!cell.open) { cell.flag = !cell.flag; button.textContent = cell.flag ? '🚩' : ''; updateMineCount(); } });
    return button;
  }));
  updateMineCount();
}
function neighbors(i) {
  const { rows, cols } = levels[currentLevel];
  const r=Math.floor(i/cols), c=i%cols, out=[];
  for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
    const nr=r+y,nc=c+x;
    if((x||y)&&nr>=0&&nr<rows&&nc>=0&&nc<cols)out.push(nr*cols+nc);
  }
  return out;
}
function placeMines(firstIndex) {
  const config = levels[currentLevel];
  const safe = new Set([firstIndex, ...neighbors(firstIndex)]);
  const available = mineState.map((_, i) => i).filter(i => !safe.has(i));
  for (let placed = 0; placed < config.mines; placed++) {
    const pick = Math.floor(Math.random() * available.length);
    mineState[available.splice(pick, 1)[0]].mine = true;
  }
}
function openCell(i) {
  const cell=mineState[i]; if(cell.open||cell.flag)return;
  if (firstMove) { placeMines(i); firstMove = false; }
  if (!mineTimer) mineTimer=setInterval(()=>{ seconds++; document.querySelector('#mine-time').textContent=String(Math.min(999,seconds)).padStart(3,'0'); },1000);
  cell.open=true; const el=mineBoard.children[i]; el.classList.add('open');
  if(cell.mine){ el.textContent='✹'; mineReset.dataset.face='normal'; clearInterval(mineTimer); mineState.forEach((v,n)=>{if(v.mine)mineBoard.children[n].textContent='✹';}); return; }
  const n=neighbors(i).filter(j=>mineState[j].mine).length; el.dataset.n=n; el.textContent=n||''; if(!n)neighbors(i).forEach(openCell);
  if(mineState.filter(v=>!v.mine).every(v=>v.open)){mineReset.dataset.face='cool';clearInterval(mineTimer);}
}
function updateMineCount(){ const flags=mineState.filter(v=>v.flag).length; const total=levels[currentLevel].mines; document.querySelector('#mine-counter').textContent=String(Math.max(0,total-flags)).padStart(3,'0'); }

function updateClock() {
  const now = new Date();
  document.querySelector('#clock').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 1000);
