// ===== База данных пользователей (имитация через LocalStorage) =====
let currentUser = localStorage.getItem('tm_currentUser') || null;

function getUsers() { return JSON.parse(localStorage.getItem('tm_users')) || {}; }
function saveUsers(users) { localStorage.setItem('tm_users', JSON.stringify(users)); }

// ===== Состояние приложения =====
const state = {
  currentTextObj: null,  // Объект текущего текста
  chunkIndex: 0, currentRepeat: 0, forceReadAgain: false
};

// ===== DOM-элементы =====
const screens = {
  auth: document.getElementById('screen-auth'),
  menu: document.getElementById('screen-menu'),
  view: document.getElementById('screen-view'),
  check: document.getElementById('screen-check'),
  result: document.getElementById('screen-result'),
  done: document.getElementById('screen-done'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ===== АВТОРИЗАЦИЯ =====
document.getElementById('btn-login').addEventListener('click', () => {
  const name = document.getElementById('auth-name').value.trim();
  if (!name) return alert('Введите имя!');
  
  currentUser = name;
  localStorage.setItem('tm_currentUser', currentUser);
  
  // Создаем пользователя, если его нет
  const users = getUsers();
  if (!users[currentUser]) {
    users[currentUser] = { texts: [] };
    saveUsers(users);
  }
  initMenu();
});

document.getElementById('btn-logout').addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('tm_currentUser');
  document.getElementById('auth-name').value = '';
  document.getElementById('user-panel').style.display = 'none';
  showScreen('auth');
});

function checkAuth() {
  if (currentUser) {
    const users = getUsers();
    if (!users[currentUser]) {
      users[currentUser] = { texts: [] };
      saveUsers(users);
    }
    initMenu();
  } else {
    showScreen('auth');
  }
}

// ===== ГЛАВНОЕ МЕНЮ =====
function initMenu() {
  document.getElementById('user-panel').style.display = 'block';
  document.getElementById('user-greeting').textContent = `Привет, ${currentUser}!`;
  renderSavedTexts();
  showScreen('menu');
}

function renderSavedTexts() {
  const users = getUsers();
  const myTexts = users[currentUser].texts;
  const container = document.getElementById('saved-texts-list');
  container.innerHTML = '';

  if (myTexts.length === 0) {
    container.innerHTML = '<p class="hint">У вас пока нет сохраненных текстов.</p>';
    return;
  }

  myTexts.forEach((text, index) => {
    const div = document.createElement('div');
    div.className = 'saved-item';
    div.innerHTML = `
      <div>
        <strong>${text.title}</strong><br>
        <small style="color:#718096">Строчек: ${text.lines.length}</small>
      </div>
      <div>
        <button onclick="startSavedText(${index})">Учить</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.startSavedText = function(index) {
  const users = getUsers();
  state.currentTextObj = users[currentUser].texts[index];
  startLearning();
};

// ===== СОЗДАНИЕ И СТАРТ НОВОГО ТЕКСТА =====
document.getElementById('btn-start').addEventListener('click', () => {
  const title = document.getElementById('text-title').value.trim() || 'Без названия';
  const raw = document.getElementById('text-input').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) return alert('Вставь хотя бы одну строку текста!');

  const chunkSize = parseInt(document.getElementById('lines-per-chunk').value, 10);
  const repeatsPerChunk = parseInt(document.getElementById('repeats-per-chunk').value, 10);

  const newText = { title, lines, chunkSize, repeatsPerChunk };
  
  // Сохраняем
  const users = getUsers();
  users[currentUser].texts.push(newText);
  saveUsers(users);

  state.currentTextObj = newText;
  startLearning();
});

// ===== ЛОГИКА ЗАУЧИВАНИЯ =====
function startLearning() {
  state.chunkIndex = 0;
  state.currentRepeat = 0;
  state.forceReadAgain = false;
  showViewScreen();
}

function getCurrentChunk() {
  const t = state.currentTextObj;
  return t.lines.slice(state.chunkIndex * t.chunkSize, state.chunkIndex * t.chunkSize + t.chunkSize);
}

function getTotalChunks() {
  return Math.ceil(state.currentTextObj.lines.length / state.currentTextObj.chunkSize);
}

function showViewScreen() {
  if (state.chunkIndex >= getTotalChunks()) return showScreen('done');
  
  const chunk = getCurrentChunk();
  const viewLines = document.getElementById('view-lines');
  viewLines.innerHTML = '';
  
  // Если была ошибка, добавляем предупреждение
  if (state.forceReadAgain) {
    const warn = document.createElement('div');
    warn.style.cssText = 'color: #e53e3e; font-weight: bold; margin-bottom: 10px; text-align: center;';
    warn.textContent = '❌ Вы ошиблись! Прочитайте эти строки ВНИМАТЕЛЬНО еще раз.';
    viewLines.appendChild(warn);
  }

  chunk.forEach(line => {
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = line;
    viewLines.appendChild(div);
  });

  const total = getTotalChunks();
  document.getElementById('progress-fill').style.width = (state.chunkIndex / total) * 100 + '%';
  document.getElementById('progress-text').textContent = `Блок ${state.chunkIndex + 1} из ${total} · повтор ${state.currentRepeat + 1}/${state.currentTextObj.repeatsPerChunk}`;
  
  showScreen('view');
  state.forceReadAgain = false; // Сбрасываем флаг после показа
}

document.getElementById('btn-next').addEventListener('click', showCheckScreen);

function showCheckScreen() {
  const chunk = getCurrentChunk();
  const container = document.getElementById('check-inputs');
  container.innerHTML = '';

  chunk.forEach((line, i) => {
    const label = document.createElement('label');
    label.textContent = `Строчка ${i + 1}`;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Напиши по памяти...';
    input.autocomplete = 'off';
    container.appendChild(label);
    container.appendChild(input);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-submit').click(); }
    });
  });

  showScreen('check');
  const firstInput = container.querySelector('input');
  if (firstInput) firstInput.focus();
}

function normalize(str) {
  return (str || '').trim().toLowerCase().replace(/[.,!?;:—–\-«»"()]/g, '').replace(/\s+/g, ' ');
}

document.getElementById('btn-submit').addEventListener('click', () => {
  const chunk = getCurrentChunk();
  const inputs = document.querySelectorAll('#check-inputs input');
  let allCorrect = true;
  const results = [];

  inputs.forEach((input, i) => {
    const isCorrect = normalize(input.value) === normalize(chunk[i]);
    if (!isCorrect) allCorrect = false;
    results.push({ expected: chunk[i], actual: input.value, correct: isCorrect });
    input.classList.add(isCorrect ? 'correct' : 'wrong');
  });

  showResultScreen(results, allCorrect);
});

function showResultScreen(results, allCorrect) {
  document.getElementById('result-title').textContent = allCorrect ? '✅ Всё верно!' : '❌ Есть ошибки';
  
  const body = document.getElementById('result-body');
  body.innerHTML = '';
  results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'result-item ' + (r.correct ? 'ok' : 'fail');
    item.innerHTML = `
      <div class="label">${r.correct ? '✓ Верно' : '✗ Ошибка'}</div>
      <div class="expected">Правильно: ${r.expected}</div>
      ${!r.correct ? `<div class="actual">Вы написали: ${r.actual || '(пусто)'}</div>` : ''}
    `;
    body.appendChild(item);
  });

  const btnRepeat = document.getElementById('btn-repeat');
  const btnContinue = document.getElementById('btn-continue');

  if (!allCorrect) {
    // ЕСЛИ ОШИБКА: заставляем перечитать этот же блок, скрываем кнопку продолжить
    btnRepeat.style.display = 'block';
    btnRepeat.textContent = 'Прочитать заново →';
    btnRepeat.onclick = () => { state.forceReadAgain = true; showViewScreen(); };
    btnContinue.style.display = 'none';
  } else {
    // ЕСЛИ ВСЁ ВЕРНО
    btnRepeat.style.display = 'block';
    btnRepeat.onclick = () => { state.forceReadAgain = true; showViewScreen(); };
    
    btnContinue.style.display = 'block';
    btnContinue.onclick = () => {
      state.currentRepeat++;
      if (state.currentRepeat < state.currentTextObj.repeatsPerChunk) {
        showViewScreen();
      } else {
        state.currentRepeat = 0;
        state.chunkIndex++;
        if (state.chunkIndex >= getTotalChunks()) showScreen('done');
        else showViewScreen();
      }
    };
  }
  showScreen('result');
}

// ===== ФИНАЛ =====
document.getElementById('btn-back-to-menu').addEventListener('click', () => {
  initMenu();
});

// Старт при загрузке
checkAuth();
