// Ждем полной загрузки страницы, чтобы Firebase успел инициализироваться
window.addEventListener('load', () => {
  setTimeout(initApp, 500); 
});

function initApp() {
  if (!window.firebaseTools) {
    console.error("Firebase не загрузился! Проверь файл firebase.js и ключи.");
    alert("Ошибка подключения к базе данных. Обновите страницу.");
    return;
  }

  const { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, setDoc, getDoc } = window.firebaseTools;

  let currentUser = null;
  let isRegisterMode = false;
  
  // Добавили progress для сохранения
  let state = { 
    currentTextObj: null, 
    chunkIndex: 0, 
    currentRepeat: 0, 
    forceReadAgain: false, 
    isMergeCheck: false,
    currentTextId: null // ID текста для сохранения прогресса
  };

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

  // ===== АВТОРИЗАЦИЯ И ГЛАЗИК =====
  const authTitle = document.getElementById('auth-title');
  const authHint = document.getElementById('auth-hint');
  const btnLogin = document.getElementById('btn-login');
  const btnRegMode = document.getElementById('btn-register-mode');
  
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('auth-password');

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });
  }

  btnRegMode.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      authTitle.textContent = 'Регистрация';
      authHint.textContent = 'Введите Email и придумайте пароль.';
      btnLogin.textContent = 'Зарегистрироваться';
      btnRegMode.textContent = 'У меня уже есть аккаунт (Войти)';
    } else {
      authTitle.textContent = 'Вход в систему';
      authHint.textContent = 'Введите Email и пароль.';
      btnLogin.textContent = 'Войти';
      btnRegMode.textContent = 'У меня нет аккаунта (Регистрация)';
    }
  });

  btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('auth-login').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return alert('Заполните Email и пароль!');
    if (password.length < 6) return alert('Пароль должен быть не менее 6 символов!');

    try {
      if (isRegisterMode) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), { texts: [] });
        alert('Аккаунт создан!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      document.getElementById('auth-login').value = '';
      document.getElementById('auth-password').value = '';
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      document.getElementById('user-panel').style.display = 'block';
      document.getElementById('user-greeting').textContent = `Привет, ${user.email}!`;
      renderSavedTexts();
      showScreen('menu');
    } else {
      currentUser = null;
      document.getElementById('user-panel').style.display = 'none';
      showScreen('auth');
    }
  });

  // ===== ГЛАВНОЕ МЕНЮ =====
  async function renderSavedTexts() {
    if (!currentUser) return;
    const container = document.getElementById('saved-texts-list');
    container.innerHTML = '<p class="hint">Загрузка...</p>';

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, { texts: [] });
        container.innerHTML = '<p class="hint">У вас пока нет сохраненных текстов.</p>';
        return;
      }

      const myTexts = userDoc.data().texts || [];
      container.innerHTML = '';

      if (myTexts.length === 0) {
        container.innerHTML = '<p class="hint">У вас пока нет сохраненных текстов.</p>';
        return;
      }

      myTexts.forEach((text, index) => {
        const div = document.createElement('div');
        div.className = 'saved-item';
        
        // Показываем прогресс, если он есть
        let progressText = '';
        if (text.progress && text.progress.chunkIndex > 0) {
           progressText = `<br><small style="color:#48bb78">Прогресс: блок ${text.progress.chunkIndex + 1}</small>`;
        }

        div.innerHTML = `
          <div>
            <strong>${text.title}</strong><br>
            <small style="color:#718096">Строчек: ${text.lines.length}</small>
            ${progressText}
          </div>
          <div>
            <button onclick="startSavedText(${index})">Учить</button>
          </div>
        `;
        container.appendChild(div);
      });

      window.currentUserTexts = myTexts;
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p class="hint" style="color:red">Ошибка загрузки данных.</p>';
    }
  }

  // Обновленная функция старта
  window.startSavedText = function(index) {
    state.currentTextObj = window.currentUserTexts[index];
    state.currentTextId = index;
    
    // Проверяем, есть ли сохраненный прогресс
    if (state.currentTextObj.progress && state.currentTextObj.progress.chunkIndex > 0) {
      const resume = confirm(`У вас есть сохраненный прогресс (Блок ${state.currentTextObj.progress.chunkIndex + 1}).\nПродолжить с этого места? (Нажмите "Отмена", чтобы начать заново)`);
      if (resume) {
        state.chunkIndex = state.currentTextObj.progress.chunkIndex;
        state.currentRepeat = state.currentTextObj.progress.currentRepeat || 0;
      } else {
        state.chunkIndex = 0;
        state.currentRepeat = 0;
      }
    } else {
      state.chunkIndex = 0;
      state.currentRepeat = 0;
    }

    state.forceReadAgain = false;
    state.isMergeCheck = false;
    showViewScreen();
  };

  // Функция сохранения прогресса
  async function saveProgress() {
    if (!currentUser || !state.currentTextObj) return;
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const texts = userDoc.data().texts;
        // Сохраняем прогресс в объект текста
        texts[state.currentTextId].progress = {
          chunkIndex: state.chunkIndex,
          currentRepeat: state.currentRepeat
        };
        await setDoc(userDocRef, { texts });
      }
    } catch (e) {
      console.error("Ошибка сохранения прогресса:", e);
    }
  }

  // ===== СОХРАНЕНИЕ НОВОГО ТЕКСТА =====
  document.getElementById('btn-start').addEventListener('click', async () => {
    if (!currentUser) return alert('Сначала войдите!');

    const title = document.getElementById('text-title').value.trim() || 'Без названия';
    const raw = document.getElementById('text-input').value;
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) return alert('Вставь хотя бы одну строку текста!');

    const chunkSize = parseInt(document.getElementById('lines-per-chunk').value, 10);
    const repeatsPerChunk = parseInt(document.getElementById('repeats-per-chunk').value, 10);
    const newText = { title, lines, chunkSize, repeatsPerChunk, progress: { chunkIndex: 0, currentRepeat: 0 } };
    
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const existingTexts = userDoc.exists() ? (userDoc.data().texts || []) : [];
      existingTexts.push(newText);
      
      await setDoc(userDocRef, { texts: existingTexts });
      
      document.getElementById('text-title').value = '';
      document.getElementById('text-input').value = '';
      
      // Устанавливаем ID для только что созданного текста
      state.currentTextId = existingTexts.length - 1;
      state.currentTextObj = newText;
      state.chunkIndex = 0;
      state.currentRepeat = 0;
      state.forceReadAgain = false;
      state.isMergeCheck = false;
      
      showViewScreen();
    } catch (e) {
      alert('Ошибка сохранения: ' + e.message);
    }
  });

  // ===== ЛОГИКА ЗАУЧИВАНИЯ =====
  function getCurrentChunk() {
    const t = state.currentTextObj;
    if (state.isMergeCheck) {
      const endIndex = (state.chunkIndex + 1) * t.chunkSize;
      return t.lines.slice(0, endIndex);
    }
    return t.lines.slice(state.chunkIndex * t.chunkSize, state.chunkIndex * t.chunkSize + t.chunkSize);
  }

  function getTotalChunks() {
    return Math.ceil(state.currentTextObj.lines.length / state.currentTextObj.chunkSize);
  }

  function renderJumpSelect() {
    const select = document.getElementById('jump-select');
    if (!select) return;
    select.innerHTML = '';
    const total = getTotalChunks();
    
    for (let i = 0; i < total; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Блок ${i + 1} (стр. ${i * state.currentTextObj.chunkSize + 1}–${Math.min((i + 1) * state.currentTextObj.chunkSize, state.currentTextObj.lines.length)})`;
      select.appendChild(option);
    }
    
    select.value = state.chunkIndex;
    
    select.onchange = (e) => {
      state.chunkIndex = parseInt(e.target.value, 10);
      state.currentRepeat = 0;
      state.forceReadAgain = false;
      state.isMergeCheck = false;
      saveProgress(); // Сохраняем, когда прыгаем вручную
      showViewScreen();
    };
  }

  function showViewScreen() {
    if (state.chunkIndex >= getTotalChunks()) return showScreen('done');
    
    const chunk = getCurrentChunk();
    const viewLines = document.getElementById('view-lines');
    viewLines.innerHTML = '';
    
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
    
    if (state.isMergeCheck) {
       document.getElementById('progress-text').textContent = `Снежный ком: строки 1–${(state.chunkIndex + 1) * state.currentTextObj.chunkSize}`;
    } else {
       document.getElementById('progress-text').textContent = `Блок ${state.chunkIndex + 1} из ${total} · повтор ${state.currentRepeat + 1}/${state.currentTextObj.repeatsPerChunk}`;
    }
    
    renderJumpSelect();
    
    // АВТОСОХРАНЕНИЕ при показе экрана
    saveProgress();
    
    showScreen('view');
    state.forceReadAgain = false;
  }

  document.getElementById('btn-next').addEventListener('click', () => {
    showCheckScreen();
  });

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
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault(); 
          const inputs = document.querySelectorAll('#check-inputs input');
          if (i < inputs.length - 1) {
            inputs[i + 1].focus();
          } else {
            document.getElementById('btn-submit').click();
          }
        }
      });

      container.appendChild(label);
      container.appendChild(input);
    });

    showScreen('check');
    const firstInput = container.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function normalize(str) {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/[.,!?;:—–\-«»"()]/g, '').replace(/\s+/g, '');
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
    const btnCombined = document.getElementById('btn-combined-check');

    btnCombined.style.display = 'none';
    btnRepeat.style.display = 'block';
    btnContinue.style.display = 'none';

    if (!allCorrect) {
      btnRepeat.textContent = 'Прочитать заново →';
      btnRepeat.onclick = () => { state.forceReadAgain = true; showViewScreen(); };
    } else {
      btnRepeat.textContent = 'Прочитать еще раз';
      btnRepeat.onclick = () => { state.forceReadAgain = true; showViewScreen(); };

      if (state.isMergeCheck) {
        btnContinue.style.display = 'block';
        btnContinue.textContent = 'Продолжить →';
        btnContinue.onclick = () => {
          state.isMergeCheck = false;
          state.currentRepeat = 0;
          state.chunkIndex++;
          if (state.chunkIndex >= getTotalChunks()) showScreen('done');
          else showViewScreen();
        };
      } else {
        if (state.currentRepeat === state.currentTextObj.repeatsPerChunk - 1) {
          if (state.chunkIndex > 0 || state.currentTextObj.chunkSize > 1) {
            btnCombined.style.display = 'block';
            btnCombined.textContent = `📝 Соединить (строки 1–${(state.chunkIndex + 1) * state.currentTextObj.chunkSize})`;
            btnCombined.onclick = () => {
              state.isMergeCheck = true;
              state.forceReadAgain = false;
              showViewScreen();
            };
          }
          
          btnContinue.style.display = 'block';
          btnContinue.textContent = 'Пропустить снежный ком →';
          btnContinue.onclick = () => {
            state.currentRepeat = 0;
            state.chunkIndex++;
            if (state.chunkIndex >= getTotalChunks()) showScreen('done');
            else showViewScreen();
          };
        } else {
          btnContinue.style.display = 'block';
          btnContinue.textContent = 'Продолжить →';
          btnContinue.onclick = () => {
            state.currentRepeat++;
            saveProgress(); // Сохраняем повтор
            showViewScreen();
          };
        }
      }
    }
    showScreen('result');
  }

  document.getElementById('btn-back-to-menu').addEventListener('click', () => {
    saveProgress(); // Сохраняем при выходе в меню
    renderSavedTexts();
    showScreen('menu');
  });
}
