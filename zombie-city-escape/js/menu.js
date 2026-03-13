(() => {
  const menuTabs = Array.from(document.querySelectorAll('[data-menu]'));
  const menuPanels = Array.from(document.querySelectorAll('[data-panel]'));
  const menuStartButton = document.getElementById('menuStartButton');
  const menuLevelValue = document.getElementById('menuLevelValue');
  const menuHighScoreValue = document.getElementById('menuHighScoreValue');
  const menuHighScoreValueAlt = document.getElementById('menuHighScoreValueAlt');
  const menuLastScoreValue = document.getElementById('menuLastScoreValue');
  const menuSelectedLevelValue = document.getElementById('menuSelectedLevelValue');
  const menuTargetValue = document.getElementById('menuTargetValue');
  const levelButtons = Array.from(document.querySelectorAll('[data-level]'));




  let selectedLevel = 1;
  const levelTargets = {
    1: 2500,
    2: 4500,
    3: 6000,
    4: 12000,
    5: 17000,
    6: 21000,
    7: 26000,
    8: 32000,
    9: 38000,
    10: 50000
  };

  function updateMenuStats() {
    const highScore = Number(localStorage.getItem('zce_high_score') || 0);
    const lastScore = Number(localStorage.getItem('zce_last_score') || 0);

    if (menuLevelValue) {
      menuLevelValue.textContent = String(selectedLevel);
    }
    if (menuSelectedLevelValue) {
      menuSelectedLevelValue.textContent = String(selectedLevel);
    }
    if (menuHighScoreValue) {
      menuHighScoreValue.textContent = String(highScore);
    }
    if (menuHighScoreValueAlt) {
      menuHighScoreValueAlt.textContent = String(highScore);
    }
    if (menuLastScoreValue) {
      menuLastScoreValue.textContent = String(lastScore);
    }
    if (menuTargetValue) {
      menuTargetValue.textContent = String(levelTargets[selectedLevel] || 100000);
    }
  }

  function setActiveMenuPanel(name) {
    menuPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === name);
    });
    menuTabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.menu === name);
    });
  }

  function setSelectedLevel(level) {
    selectedLevel = level;
    updateMenuStats();
    levelButtons.forEach((button) => {
      button.classList.toggle('is-selected', Number(button.dataset.level) === level);
    });
  }

  function startGame() {
    window.location.href = `index.html?level=${selectedLevel}`;
  }

  menuTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActiveMenuPanel(tab.dataset.menu);
    });
  });

  levelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedLevel(Number(button.dataset.level));
      setActiveMenuPanel('home');
    });
  });

  if (menuStartButton) {
    menuStartButton.addEventListener('click', startGame);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      startGame();
    }
  });

  setSelectedLevel(1);
  setActiveMenuPanel('levels');
  updateMenuStats();
})();
