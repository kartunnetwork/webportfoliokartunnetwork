const desktop = document.querySelector('#desktop');
const sitePreloader = document.querySelector('#site-preloader');
const preloaderFill = sitePreloader.querySelector('.preloader-track i');
let preloaderFinished = false;
function finishPreloader() {
  if (preloaderFinished) return;
  preloaderFinished = true;
  sitePreloader.classList.add('finished');
  window.setTimeout(() => sitePreloader.remove(), 220);
}
const navigationEntry = performance.getEntriesByType('navigation')[0];
const isHistoryReturn = navigationEntry?.type === 'back_forward';
if (isHistoryReturn) {
  preloaderFinished = true;
  sitePreloader.remove();
} else {
  preloaderFill.addEventListener('animationend', finishPreloader);
  window.setTimeout(finishPreloader, 3300);
}
const icons = [...document.querySelectorAll('.desktop-icon')];
const didYouKnow = document.querySelector('#did-you-know');
const didYouKnowFact = document.querySelector('#did-you-know-fact');
const didYouKnowFacts = [
  'Старые reCAPTCHA показывали слова, которые компьютер не смог разобрать в отсканированных книгах. Пока вы доказывали, что не робот, вы заодно помогали машинам читать архивы.',
  'В 1947 году инженеры нашли мотылька внутри реле компьютера Harvard Mark II и вклеили его в журнал с подписью «первый реальный случай обнаружения бага».',
  'Самая первая страница в интернете была инструкцией по использованию самого интернета: что такое Всемирная паутина, как создать сервер и где искать другие страницы.',
  'В декабре 1992 года инженер отправил с компьютера на телефон сообщение «Merry Christmas». Ответить с телефона тогда было нельзя.',
  'В 1974 году кассир впервые просканировала упаковку жевательной резинки Wrigley’s. Покупатель сохранил чек, а сама упаковка позже попала в музей.',
  '«Косынка» помогала освоить перетаскивание объектов, а «Сапёр» — различие между левой и правой кнопками. Игры были замаскированными уроками интерфейса.',
  'Windows 95 продавалась на тринадцати дискетах. Их нужно было вставлять по очереди. Ошибка на последней превращала установку операционной системы в особенно содержательный вечер.',
  'Слово «пасхалка» появилось после найденной комнаты. Игрок обнаружил секретную надпись Робинетта, а Atari решила не удалять её. Скрытые сюрпризы предложили называть пасхальными яйцами — вещами, которые приятно искать.'
];
let didYouKnowIndex = 0;
let didYouKnowTimer = null;
function showNextFact() {
  didYouKnowFact.textContent = didYouKnowFacts[didYouKnowIndex];
  didYouKnowIndex = (didYouKnowIndex + 1) % didYouKnowFacts.length;
}
showNextFact();
didYouKnowTimer = window.setInterval(showNextFact, 5000);
didYouKnow.querySelector('.did-you-know-close').addEventListener('click', () => {
  didYouKnow.hidden = true;
  window.clearInterval(didYouKnowTimer);
});
const didYouKnowTitle = document.querySelector('#did-you-know-title');
let factMoveState = null;
function rectanglesOverlap(a, b, gap = 5) {
  return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
}
function factPositionIsFree(left, top) {
  const candidate = {
    left,
    top,
    right: left + didYouKnow.offsetWidth,
    bottom: top + didYouKnow.offsetHeight
  };
  const obstacles = [
    ...document.querySelectorAll('.desktop-icon:not(.trashed), .window:not([hidden]), .start-menu:not([hidden])')
  ].filter(element => element !== didYouKnow && element.offsetParent !== null);
  return obstacles.every(element => !rectanglesOverlap(candidate, element.getBoundingClientRect()));
}
didYouKnow.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('.did-you-know-close')) return;
  event.preventDefault();
  const rect = didYouKnow.getBoundingClientRect();
  didYouKnow.style.right = 'auto';
  didYouKnow.style.left = `${rect.left}px`;
  didYouKnow.style.top = `${rect.top}px`;
  factMoveState = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  didYouKnow.setPointerCapture(event.pointerId);
});
didYouKnow.addEventListener('pointermove', event => {
  if (!factMoveState || event.pointerId !== factMoveState.pointerId) return;
  const maxLeft = Math.max(0, desktop.clientWidth - didYouKnow.offsetWidth);
  const maxTop = Math.max(0, desktop.clientHeight - taskbarHeight() - didYouKnow.offsetHeight);
  const nextLeft = Math.max(0, Math.min(maxLeft, factMoveState.left + event.clientX - factMoveState.x));
  const nextTop = Math.max(0, Math.min(maxTop, factMoveState.top + event.clientY - factMoveState.y));
  if (factPositionIsFree(nextLeft, nextTop)) {
    didYouKnow.style.left = `${nextLeft}px`;
    didYouKnow.style.top = `${nextTop}px`;
  }
});
function stopFactMove(event) {
  if (!factMoveState || event.pointerId !== factMoveState.pointerId) return;
  factMoveState = null;
}
didYouKnow.addEventListener('pointerup', stopFactMove);
didYouKnow.addEventListener('pointercancel', stopFactMove);
const retroCursor = document.querySelector('#retro-cursor');
let busyCursorTimer = null;
document.documentElement.classList.add('custom-cursor-ready');
document.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  retroCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
});
function showBusyCursor(duration = 850) {
  document.documentElement.classList.add('cursor-busy');
  clearTimeout(busyCursorTimer);
  busyCursorTimer = setTimeout(() => document.documentElement.classList.remove('cursor-busy'), duration);
}
let drag = null;
const undoStack = [];
const recycleEntries = [];
let recycleSequence = 0;
const trash = document.querySelector('.recycle-bin');
let desktopSize = { width: desktop.clientWidth, height: desktop.clientHeight };
function taskbarHeight() { return document.querySelector('.taskbar')?.offsetHeight || 45; }
function iconWidth(icon) { return icon?.offsetWidth || 70; }
function iconHeight(icon) { return icon?.offsetHeight || 70; }

icons.forEach(icon => {
  const x = Number(icon.dataset.x);
  const y = Number(icon.dataset.y);
  icon.style.left = `${Math.max(0, Math.min(desktop.clientWidth - iconWidth(icon), x / 1400 * desktop.clientWidth))}px`;
  icon.style.top = `${Math.max(0, Math.min(desktop.clientHeight - taskbarHeight() - iconHeight(icon), y / 705 * desktop.clientHeight))}px`;
});
arrangeIconsForViewport();

function ensureTopFolderSpacing() {
  const logos = document.querySelector('[data-app="logos-folder"]');
  const wedding = document.querySelector('[data-app="wedding-folder"]');
  if (!logos || !wedding) return;
  const logosLeft = parseFloat(logos.style.left) || 0;
  const weddingLeft = parseFloat(wedding.style.left) || 0;
  const logosTop = parseFloat(logos.style.top) || 0;
  const weddingTop = parseFloat(wedding.style.top) || 0;
  if (Math.abs(logosTop - weddingTop) >= 70 || Math.abs(logosLeft - weddingLeft) >= 96) return;
  const rightPosition = logosLeft + 96;
  if (rightPosition <= desktop.clientWidth - iconWidth(wedding)) wedding.style.left = `${rightPosition}px`;
  else logos.style.left = `${Math.max(0, weddingLeft - 96)}px`;
}

function arrangeIconsForViewport() {
  if (desktop.clientWidth >= 900) {
    ensureTopFolderSpacing();
    resolveIconOverlaps();
    return;
  }
  const visibleIcons = icons.filter(icon => !icon.classList.contains('trashed'));
  const size = 70;
  const sidePadding = 10;
  const workHeight = desktop.clientHeight - taskbarHeight();
  const factBottom = !didYouKnow.hidden ? didYouKnow.getBoundingClientRect().bottom + 14 : 12;
  const availableTop = Math.max(factBottom, Math.round(workHeight * .2));
  const availableHeight = Math.max(size, workHeight - availableTop - size - 10);
  const conceptualColumns = desktop.clientWidth <= 360 ? 4 : 5;
  const scatter = {
    'logos-folder': [1, 2], 'wedding-folder': [0, 1], 'welcome-file': [4, 0], 'hh-resume': [4, 2],
    'misc-folder': [0, 3], 'беханс': [2, 2], 'моск. метро': [2, 3], 'telegram': [4, 3],
    'mail-menu': [1, 0], 'meme': [1, 4], 'meme2': [3, 5], 'minesweeper': [4, 4], 'recycle': [0, 5]
  };
  visibleIcons.forEach((icon, index) => {
    const key = icon.dataset.app || icon.dataset.file || icon.dataset.name;
    const point = scatter[key] || [index % 5, Math.floor(index / 5)];
    const column = conceptualColumns === 5 ? point[0] : Math.round(point[0] / 4 * 3);
    const left = sidePadding + column / Math.max(1, conceptualColumns - 1) * (desktop.clientWidth - sidePadding * 2 - size);
    const top = availableTop + point[1] / 5 * availableHeight;
    icon.style.left = `${left}px`;
    icon.style.top = `${Math.min(workHeight - size, top)}px`;
  });
  resolveIconOverlaps();
}

function resolveIconOverlaps() {
  const visibleIcons = icons.filter(icon => !icon.classList.contains('trashed'));
  const workHeight = desktop.clientHeight - taskbarHeight();
  const factRect = !didYouKnow.hidden ? didYouKnow.getBoundingClientRect() : null;
  const placed = [];
  const gap = 4;
  const overlapsRect = (a, b) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
  const isFree = rect => rect.left >= 0 && rect.top >= 0 && rect.right <= desktop.clientWidth && rect.bottom <= workHeight
    && (!factRect || !overlapsRect(rect, factRect)) && placed.every(other => !overlapsRect(rect, other));
  visibleIcons.forEach(icon => {
    const width = iconWidth(icon);
    const height = iconHeight(icon);
    const desiredLeft = Math.max(0, Math.min(desktop.clientWidth - width, parseFloat(icon.style.left) || 0));
    const desiredTop = Math.max(0, Math.min(workHeight - height, parseFloat(icon.style.top) || 0));
    let chosen = { left: desiredLeft, top: desiredTop, right: desiredLeft + width, bottom: desiredTop + height };
    if (!isFree(chosen)) {
      const candidates = [];
      for (let top = 4; top <= workHeight - height; top += height + gap) {
        for (let left = 4; left <= desktop.clientWidth - width; left += width + gap) {
          const rect = { left, top, right: left + width, bottom: top + height };
          if (isFree(rect)) candidates.push({ rect, distance: (left - desiredLeft) ** 2 + (top - desiredTop) ** 2 });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance);
      if (candidates[0]) chosen = candidates[0].rect;
    }
    icon.style.left = `${chosen.left}px`;
    icon.style.top = `${chosen.top}px`;
    placed.push(chosen);
  });
}

function openDesktopApp(icon) {
  if (icon.dataset.app !== 'mail-menu') showBusyCursor();
  if (icon.dataset.app === 'minesweeper') openMinesweeper();
  if (icon.dataset.app === 'meme') openMemeViewer();
  if (icon.dataset.app === 'wedding-folder') openWeddingFolder();
  if (icon.dataset.app === 'recycle') openRecycleBin();
  if (icon.dataset.app === 'logos-folder') openLogosFolder();
  if (icon.dataset.app === 'meme2') openMeme2Viewer();
  if (icon.dataset.app === 'misc-folder') openMiscFolder();
  if (icon.dataset.app === 'mail-menu') toggleMailMenu(icon);
  if (icon.dataset.app === 'welcome-file') openWelcomeFile();
  if (icon.dataset.app === 'hh-resume') openResumeFile();
  const windowSelector = {
    minesweeper: '#mines-window', meme: '#image-window', 'wedding-folder': '#folder-window',
    recycle: '#recycle-window', 'logos-folder': '#logos-window', meme2: '#meme2-window',
    'misc-folder': '#misc-window', 'welcome-file': '#welcome-window', 'hh-resume': '#resume-window'
  }[icon.dataset.app];
  const openedWindow = windowSelector ? document.querySelector(windowSelector) : null;
  if (openedWindow && !openedWindow.hidden) bringWindowToFront(openedWindow);
}

function selectIcon(icon, additive = false) {
  if (!additive) icons.forEach(item => item.classList.remove('selected'));
  if (icon) icon.classList.add('selected');
}

icons.forEach(icon => {
  icon.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) icon.classList.toggle('selected');
    else if (!icon.classList.contains('selected')) selectIcon(icon);
    if (!icon.classList.contains('selected')) return;
    const group = icons.filter(item => item.classList.contains('selected') && !item.classList.contains('trashed'));
    const positions = group.map(item => {
      const rect = item.getBoundingClientRect();
      return { item, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
    drag = { icon, startX: event.clientX, startY: event.clientY, positions, moved: false };
    icon.setPointerCapture(event.pointerId);
  });

  icon.addEventListener('pointermove', event => {
    if (!drag || drag.icon !== icon) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    const minLeft = Math.min(...drag.positions.map(position => position.left));
    const minTop = Math.min(...drag.positions.map(position => position.top));
    const maxRight = Math.max(...drag.positions.map(position => position.left + position.width));
    const maxBottom = Math.max(...drag.positions.map(position => position.top + position.height));
    const safeDx = Math.max(-minLeft, Math.min(desktop.clientWidth - maxRight, dx));
    const safeDy = Math.max(-minTop, Math.min(desktop.clientHeight - taskbarHeight() - maxBottom, dy));
    drag.positions.forEach(position => {
      position.item.classList.add('dragging');
      position.item.style.left = `${position.left + safeDx}px`;
      position.item.style.top = `${position.top + safeDy}px`;
    });
    if (icon !== trash) icon.classList.toggle('over-trash', overlaps(icon, trash));
  });

  icon.addEventListener('pointerup', event => {
    if (!drag || drag.icon !== icon) return;
    const wasMoved = drag.moved;
    const shouldOpen = !drag.moved && icon.matches('a.external');
    const shouldTrash = drag.moved && icon !== trash && overlaps(icon, trash);
    drag.positions.forEach(position => position.item.classList.remove('dragging'));
    icon.classList.remove('over-trash');
    if (shouldTrash) {
      const original = drag.positions.find(position => position.item === icon);
      const entry = { id: ++recycleSequence, type: 'desktop', icon, left: original.left, top: original.top, name: icon.dataset.name, imgSrc: icon.querySelector('img')?.src };
      undoStack.push(entry);
      recycleEntries.push(entry);
      icon.classList.add('trashed');
      arrangeIconsForViewport();
      renderRecycleBin();
      showToast(`${icon.dataset.name} перемещён в корзину · Ctrl+Z — вернуть`);
    }
    drag = null;
    if (shouldOpen) {
      showBusyCursor();
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
    icon.style.left = `${Math.max(0, Math.min(next.width - iconWidth(icon), parseFloat(icon.style.left) / desktopSize.width * next.width))}px`;
    icon.style.top = `${Math.max(0, Math.min(next.height - taskbarHeight() - iconHeight(icon), parseFloat(icon.style.top) / desktopSize.height * next.height))}px`;
  });
  arrangeIconsForViewport();
  desktopSize = next;
});

const selectionMarquee = document.createElement('div');
selectionMarquee.className = 'selection-marquee';
desktop.append(selectionMarquee);
let marqueeState = null;
desktop.addEventListener('pointerdown', event => {
  if (event.target !== desktop || event.button !== 0 || event.pointerType === 'touch') return;
  event.preventDefault();
  const desktopRect = desktop.getBoundingClientRect();
  const startX = Math.max(0, Math.min(desktop.clientWidth, event.clientX - desktopRect.left));
  const startY = Math.max(0, Math.min(desktop.clientHeight - taskbarHeight(), event.clientY - desktopRect.top));
  marqueeState = { pointerId: event.pointerId, startX, startY };
  selectIcon(null);
  Object.assign(selectionMarquee.style, { left: `${startX}px`, top: `${startY}px`, width: '0px', height: '0px' });
  selectionMarquee.classList.add('active');
  desktop.setPointerCapture(event.pointerId);
});
desktop.addEventListener('pointermove', event => {
  if (!marqueeState || event.pointerId !== marqueeState.pointerId) return;
  const desktopRect = desktop.getBoundingClientRect();
  const currentX = Math.max(0, Math.min(desktop.clientWidth, event.clientX - desktopRect.left));
  const currentY = Math.max(0, Math.min(desktop.clientHeight - taskbarHeight(), event.clientY - desktopRect.top));
  const left = Math.min(marqueeState.startX, currentX);
  const top = Math.min(marqueeState.startY, currentY);
  const right = Math.max(marqueeState.startX, currentX);
  const bottom = Math.max(marqueeState.startY, currentY);
  Object.assign(selectionMarquee.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
  icons.forEach(icon => {
    if (icon.classList.contains('trashed')) return icon.classList.remove('selected');
    const rect = icon.getBoundingClientRect();
    icon.classList.toggle('selected', rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top);
  });
});
function stopMarquee(event) {
  if (!marqueeState || event.pointerId !== marqueeState.pointerId) return;
  marqueeState = null;
  selectionMarquee.classList.remove('active');
}
desktop.addEventListener('pointerup', stopMarquee);
desktop.addEventListener('pointercancel', stopMarquee);

const startButton = document.querySelector('.start-button');
const startMenu = document.querySelector('#start-menu');
const shutdownBackdrop = document.querySelector('#shutdown-backdrop');
const powerScreen = document.querySelector('#power-screen');
const shutdownTrigger = document.querySelector('#shutdown-trigger');
const shutdownYes = document.querySelector('#shutdown-yes');
const shutdownNo = document.querySelector('#shutdown-no');
const bootVideo = document.querySelector('#boot-video');
let powerSequenceTimer = null;

function closeStartMenu() { startMenu.hidden = true; startButton.classList.remove('active'); }
startButton.addEventListener('click', event => {
  event.stopPropagation();
  const shouldOpen = startMenu.hidden;
  startMenu.hidden = !shouldOpen;
  startButton.classList.toggle('active', shouldOpen);
});
startMenu.addEventListener('pointerdown', event => event.stopPropagation());
startMenu.addEventListener('click', event => {
  const item = event.target.closest('[data-start-app], [data-start-url], [data-start-file], [data-start-widget]');
  if (!item) return;
  closeStartMenu();
  if (item.dataset.startWidget === 'facts') {
    didYouKnow.hidden = false;
    window.clearInterval(didYouKnowTimer);
    didYouKnowTimer = window.setInterval(showNextFact, 5000);
    arrangeIconsForViewport();
    return;
  }
  if (item.dataset.startFile) {
    const fileIcon = document.querySelector(`.desktop-icon[data-file="${item.dataset.startFile}"]`);
    if (fileIcon) selectIcon(fileIcon);
    return;
  }
  if (item.dataset.startUrl) {
    showBusyCursor();
    window.open(item.dataset.startUrl, '_blank', 'noopener');
    return;
  }
  const icon = document.querySelector(`.desktop-icon[data-app="${item.dataset.startApp}"]`);
  if (icon) openDesktopApp(icon);
});
document.addEventListener('pointerdown', event => { if (!event.target.closest('#start-menu') && !event.target.closest('.start-button')) closeStartMenu(); });

function closeShutdownDialog() { shutdownBackdrop.hidden = true; }
shutdownTrigger.addEventListener('click', () => {
  closeStartMenu();
  shutdownBackdrop.hidden = false;
  shutdownBackdrop.querySelector('input[value="shutdown"]').focus();
});
shutdownNo.addEventListener('click', closeShutdownDialog);
document.querySelector('.shutdown-close').addEventListener('click', closeShutdownDialog);

function showBootThenReload() {
  powerScreen.dataset.stage = 'boot';
  bootVideo.currentTime = 0;
  bootVideo.play().catch(() => {});
  clearTimeout(powerSequenceTimer);
  powerSequenceTimer = setTimeout(() => window.location.reload(), 15000);
}
bootVideo.addEventListener('ended', () => window.location.reload());
shutdownYes.addEventListener('click', () => {
  const action = shutdownBackdrop.querySelector('input[name="power-action"]:checked').value;
  closeShutdownDialog();
  powerScreen.hidden = false;
  powerScreen.dataset.stage = 'shutdown';
  clearTimeout(powerSequenceTimer);
  if (action === 'restart') powerSequenceTimer = setTimeout(showBootThenReload, 750);
  else powerSequenceTimer = setTimeout(() => { powerScreen.dataset.stage = 'off'; }, 900);
});
powerScreen.addEventListener('click', () => {
  if (powerScreen.dataset.stage === 'off') showBootThenReload();
});

const mailChoiceMenu = document.querySelector('#mail-choice-menu');
const contactEmail = 'dariakart9@gmail.com';
function toggleMailMenu(icon) {
  const shouldOpen = mailChoiceMenu.hidden;
  mailChoiceMenu.hidden = !shouldOpen;
  if (!shouldOpen) return;
  const rect = icon.getBoundingClientRect();
  mailChoiceMenu.style.left = `${Math.max(4, Math.min(rect.left, desktop.clientWidth - mailChoiceMenu.offsetWidth - 4))}px`;
  mailChoiceMenu.style.top = `${Math.max(4, Math.min(rect.bottom + 4, desktop.clientHeight - taskbarHeight() - mailChoiceMenu.offsetHeight - 4))}px`;
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

const welcomeWindow = document.querySelector('#welcome-window');
const welcomeTask = document.querySelector('#welcome-task');
function openWelcomeFile() {
  welcomeWindow.hidden = false;
  welcomeTask.hidden = false;
  fitWindowToDesktop(welcomeWindow);
  welcomeWindow.querySelector('.welcome-canvas').scrollTop = 0;
  welcomeWindow.querySelector('.welcome-open-list').scrollTop = 0;
}
function closeWelcomeFile() { welcomeWindow.hidden = true; welcomeTask.hidden = true; }
document.querySelector('.welcome-close').addEventListener('click', closeWelcomeFile);
welcomeTask.addEventListener('click', () => { if (welcomeWindow.hidden) openWelcomeFile(); else welcomeWindow.hidden = true; });
openWelcomeFile();
showBusyCursor(1100);

const resumeWindow = document.querySelector('#resume-window');
const resumeTask = document.querySelector('#hh-resume-task');
function fitResumeWindow() {
  resumeWindow.style.width = `${Math.min(760, desktop.clientWidth - 8)}px`;
  resumeWindow.style.height = `${Math.min(650, desktop.clientHeight - taskbarHeight() - 8)}px`;
  fitWindowToDesktop(resumeWindow);
}
function openResumeFile() {
  resumeWindow.hidden = false;
  resumeTask.hidden = false;
  fitResumeWindow();
}
function closeResumeFile() { resumeWindow.hidden = true; resumeTask.hidden = true; }
document.querySelector('.resume-close').addEventListener('click', closeResumeFile);
resumeTask.addEventListener('click', () => { if (resumeWindow.hidden) openResumeFile(); else resumeWindow.hidden = true; });

const folderWindow = document.querySelector('#folder-window');
const folderTask = document.querySelector('#folder-task');
const folderBoard = document.querySelector('#folder-whiteboard');
const folderUndo = [];
function openWeddingFolder() { folderWindow.hidden = false; folderTask.hidden = false; fitWindowToDesktop(folderWindow); }
function closeWeddingFolder() { folderWindow.hidden = true; folderTask.hidden = true; }
document.querySelector('.folder-close').addEventListener('click', closeWeddingFolder);
folderTask.addEventListener('click', () => { folderWindow.hidden = !folderWindow.hidden; });
function updateFolderStatus() { document.querySelector('#folder-status').textContent = `${folderBoard.children.length} объект(а)`; }

function usesSingleTap(event) {
  return event?.pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches;
}
function openFolderItem(item) {
  if (item?.dataset.url) { showBusyCursor(); window.open(item.dataset.url, '_blank', 'noopener,noreferrer'); }
  else if (item?.dataset.app === 'banner-viewer') { showBusyCursor(); openBannerViewer(); }
}

folderBoard.addEventListener('pointerdown', event => {
  const item = event.target.closest('.folder-item');
  folderBoard.querySelectorAll('.folder-item').forEach(el => el.classList.toggle('selected', el === item));
});
folderBoard.addEventListener('dblclick', event => {
  if (usesSingleTap()) return;
  const item = event.target.closest('.folder-item[data-url]');
  openFolderItem(item);
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
    const wasMoved = itemDrag.moved;
    itemDrag = null;
    if (!wasMoved && usesSingleTap(event)) openFolderItem(item);
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
  if (usesSingleTap()) return;
  const item = event.target.closest('.folder-item[data-url]');
  openFolderItem(item);
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
    const wasMoved = logoDrag.moved;
    logoDrag = null;
    if (!wasMoved && usesSingleTap(event)) openFolderItem(item);
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
  if (usesSingleTap()) return;
  const item = event.target.closest('.folder-item');
  openFolderItem(item);
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
    const wasMoved = miscDrag.moved;
    miscDrag = null;
    if (!wasMoved && usesSingleTap(event)) openFolderItem(item);
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
  recycleContext.style.left = `${Math.min(event.clientX, desktop.clientWidth - recycleContext.offsetWidth - 4)}px`;
  recycleContext.style.top = `${Math.min(event.clientY, desktop.clientHeight - taskbarHeight() - recycleContext.offsetHeight - 4)}px`;
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
    entry.icon.style.left = `${Math.max(0, Math.min(desktop.clientWidth - iconWidth(entry.icon), entry.left))}px`;
    entry.icon.style.top = `${Math.max(0, Math.min(desktop.clientHeight - taskbarHeight() - iconHeight(entry.icon), entry.top))}px`;
    entry.icon.classList.remove('trashed');
    selectIcon(entry.icon);
    arrangeIconsForViewport();
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
  const workHeight = desktop.clientHeight - taskbarHeight();
  const rect = win.getBoundingClientRect();
  const width = Math.min(rect.width, workWidth - 8);
  const height = Math.min(rect.height, workHeight - 8);
  win.style.transform = 'none';
  win.style.width = `${width}px`;
  win.style.height = `${height}px`;
  win.style.left = `${Math.max(4, (workWidth - width) / 2)}px`;
  win.style.top = `${Math.max(4, (workHeight - height) / 2)}px`;
}

const movableWindows = [...document.querySelectorAll('.window')];
let topWindowZ = 10;
function bringWindowToFront(activeWindow) {
  topWindowZ += 1;
  activeWindow.style.zIndex = String(topWindowZ);
}
movableWindows.forEach(win => {
  const titlebar = win.querySelector('.window-titlebar');
  if (!titlebar) return;
  let moveState = null;
  win.addEventListener('pointerdown', () => bringWindowToFront(win));
  titlebar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    bringWindowToFront(win);
    const rect = win.getBoundingClientRect();
    win.style.transform = 'none';
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;
    moveState = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    titlebar.setPointerCapture(event.pointerId);
  });
  titlebar.addEventListener('pointermove', event => {
    if (!moveState || event.pointerId !== moveState.pointerId) return;
    const maxLeft = Math.max(0, desktop.clientWidth - win.offsetWidth);
    const maxTop = Math.max(0, desktop.clientHeight - taskbarHeight() - win.offsetHeight);
    win.style.left = `${Math.max(0, Math.min(maxLeft, moveState.left + event.clientX - moveState.x))}px`;
    win.style.top = `${Math.max(0, Math.min(maxTop, moveState.top + event.clientY - moveState.y))}px`;
  });
  const stopMoving = event => {
    if (!moveState || event.pointerId !== moveState.pointerId) return;
    moveState = null;
  };
  titlebar.addEventListener('pointerup', stopMoving);
  titlebar.addEventListener('pointercancel', stopMoving);
});

const windowVisibilityObserver = new MutationObserver(entries => {
  entries.forEach(entry => {
    if (!entry.target.hidden) bringWindowToFront(entry.target);
  });
});
movableWindows.forEach(win => windowVisibilityObserver.observe(win, { attributes: true, attributeFilter: ['hidden'] }));

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
    const maxHeight = desktop.clientHeight - taskbarHeight() - top - 4;
    const minWidth = Math.min(240, maxWidth);
    const minHeight = Math.min(180, maxHeight);
    win.style.width = `${Math.max(minWidth, Math.min(maxWidth, resizeState.width + event.clientX - resizeState.x))}px`;
    win.style.height = `${Math.max(minHeight, Math.min(maxHeight, resizeState.height + event.clientY - resizeState.y))}px`;
  });
  handle.addEventListener('pointerup', () => { resizeState = null; });
});
window.addEventListener('resize', () => {
  if (!imageWindow.hidden) fitWindowToDesktop(imageWindow);
  if (!welcomeWindow.hidden) fitWindowToDesktop(welcomeWindow);
  if (!resumeWindow.hidden) fitResumeWindow();
});

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
  const cellSize = 31;
  clearInterval(mineTimer); seconds = 0; document.querySelector('#mine-time').textContent = '000';
  mineTimer = null; firstMove = true; mineReset.dataset.face = 'normal';
  mineState = Array.from({length:config.rows * config.cols}, () => ({mine:false, open:false, flag:false}));
  mineBoard.style.gridTemplateColumns = `repeat(${config.cols}, ${cellSize}px)`;
  minesWindow.style.width = `${config.cols * cellSize + 31}px`;
  mineBoard.replaceChildren(...mineState.map((cell, i) => {
    const button = document.createElement('button'); button.className = 'mine-cell'; button.type = 'button'; button.dataset.i = i;
    button.addEventListener('click', () => openCell(i));
    button.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!cell.open) {
        cell.flag = !cell.flag;
        button.textContent = '';
        button.classList.toggle('flagged', cell.flag);
        updateMineCount();
      }
    });
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
  if(cell.mine){
    el.textContent=''; el.classList.add('mine'); mineReset.dataset.face='normal'; clearInterval(mineTimer);
    mineState.forEach((v,n)=>{ if(v.mine){ mineBoard.children[n].textContent=''; mineBoard.children[n].classList.add('mine'); } });
    return;
  }
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
