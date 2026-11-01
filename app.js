const state = { allLines: [], chunkSize: 2, repeatsPerChunk: 3, chunkIndex: 0, currentRepeat: 0, lastChunkLines: [], lastChunkIndex: 0 };
const screens = { input: document.getElementById('screen-input'), view: document.getElementById('screen-view'), check: document.getElementById('screen-check'), result: document.getElementById('screen-result'), done: document.getElementById('screen-done') };

function showScreen(name) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[name].classList.add('active'); }
function normalize(str) { return (str || '').trim().toLowerCase().replace(/[.,!?;:—–\-«»"()]/g, '').replace(/\s+/g, ' '); }
function getChunk(startIndex, size) { return state.allLines.slice(startIndex, startIndex + size); }
function getTotalChunks() { return Math.ceil(state.allLines.length / state.chunkSize); }

document.getElementById('btn-start').addEventListener('click', () => {
  const raw = document.getElementById('text-input').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) { alert('Вставь хотя бы одну строку текста!'); return; }
  state.allLines = lines;
  state.chunkSize = parseInt(document.getElementById('lines-per-chunk').value, 10);
  state.repeatsPerChunk = parseInt(document.getElementById('repeats-per-chunk').value, 10);
  state.chunkIndex = 0; state.currentRepeat = 0; state.lastChunkLines = [];
  showViewScreen();
});

function showViewScreen() {
  if (state.chunkIndex >= getTotalChunks()) { showScreen('done'); return; }
  const chunk = getChunk(state.chunkIndex * state.chunkSize, state.chunkSize);
  state.lastChunkLines = chunk;
  const viewLines = document.getElementById('view-lines');
  viewLines.innerHTML = '';
  chunk.forEach(line => { const div = document.createElement('div'); div.className = 'line'; div.textContent = line; viewLines.appendChild(div); });
  const total = getTotalChunks(); const done = state.chunkIndex;
  document.getElementById('progress-fill').style.width = (total > 0 ? (done / total) * 100 : 0) + '%';
  document.getElementById('progress-text').textContent = `Блок ${done + 1} из ${total} · повтор ${state.currentRepeat + 1}/${state.repeatsPerChunk}`;
  showScreen('view');
}

document.getElementById('btn-next').addEventListener('click', () => { showCheckScreen(); });

function showCheckScreen() {
  const chunk = getChunk(state.chunkIndex * state.chunkSize, state.chunkSize);
  const container = document.getElementById('check-inputs');
  container.innerHTML = '';
  chunk.forEach((line, i) => {
    const label = document.createElement('label'); label.textContent = `Строчка ${i + 1}`;
    const input = document.createElement('input'); input.type = 'text'; input.dataset.index = i; input.placeholder = 'Напиши по памяти...'; input.autocomplete = 'off';
    container.appendChild(label); container.appendChild(input);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-submit').click(); } });
  });
  const total = getTotalChunks();
  document.getElementById('progress-fill-check').style.width = (total > 0 ? (state.chunkIndex / total) * 100 : 0) + '%';
  document.getElementById('progress-text-check').textContent = `Блок ${state.chunkIndex + 1} из ${total}`;
  showScreen('check');
  const firstInput = container.querySelector('input'); if (firstInput) firstInput.focus();
}

document.getElementById('btn-submit').addEventListener('click', () => {
  const chunk = getChunk(state.chunkIndex * state.chunkSize, state.chunkSize);
  const inputs = document.querySelectorAll('#check-inputs input');
  const results = []; let allCorrect = true;
  inputs.forEach((input, i) => {
    const userAnswer = input.value; const expected = chunk[i];
    const isCorrect = normalize(userAnswer) === normalize(expected);
    if (isCorrect) { input.classList.add('correct'); input.classList.remove('wrong'); } 
    else { input.classList.add('wrong'); input.classList.remove('correct'); allCorrect = false; }
    results.push({ expected, actual: userAnswer, correct: isCorrect });
  });
  showResultScreen(results, allCorrect);
});

function showResultScreen(results, allCorrect) {
  document.getElementById('result-title').textContent = allCorrect ? '✅ Всё верно!' : '⚠️ Есть ошибки';
  const body = document.getElementById('result-body'); body.innerHTML = '';
  results.forEach(r => {
    const item = document.createElement('div'); item.className = 'result-item ' + (r.correct ? 'ok' : 'fail');
    item.innerHTML = `<div class="label">${r.correct ? '✓ Верно' : '✗ Ошибка'}</div><div class="expected">Правильно: ${r.expected}</div>`;
    if (!r.correct) { item.innerHTML += `<div class="actual">Ты написал: ${r.actual || '(пусто)'}</div>`; }
    body.appendChild(item);
  });
  document.getElementById('btn-repeat').onclick = () => { state.currentRepeat = 0; showViewScreen(); };
  document.getElementById('btn-continue').onclick = () => continueAfterChunk(allCorrect);
  showScreen('result');
}

function continueAfterChunk(allCorrect) {
  state.currentRepeat++;
  if (state.currentRepeat < state.repeatsPerChunk) { showViewScreen(); } 
  else { state.currentRepeat = 0; state.chunkIndex++; if (state.chunkIndex >= getTotalChunks()) { showScreen('done'); } else { showViewScreen(); } }
}

document.getElementById('btn-restart').addEventListener('click', () => {
  state.allLines = []; state.chunkIndex = 0; state.currentRepeat = 0; state.lastChunkLines = [];
  document.getElementById('text-input').value = ''; showScreen('input');
});
