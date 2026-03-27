const homeScreen = document.getElementById("home-screen");
const lessonScreen = document.getElementById("lesson-screen");
const lessonTitleEl = document.getElementById("lesson-title");
const lessonBackBtn = document.getElementById("lesson-back");
const topicsGrid = document.getElementById("topics-grid");
const selectedTopicEl = document.getElementById("selected-topic");
const itemsGridEl = document.getElementById("items-grid");
const detailPanelEl = document.getElementById("item-detail");
const modeSwitchEl = document.getElementById("mode-switch");
const playerControlsEl = document.getElementById("player-controls");
const quizSectionEl = document.getElementById("quiz-section");
const quizToggleBtn = document.getElementById("quiz-toggle");
const parentOverlay = document.getElementById("parent-overlay");
const parentBody = document.getElementById("parent-body");
const parentCloseBtn = document.getElementById("parent-close");
const rewardOverlay = document.getElementById("reward-overlay");
const rewardCardEl = document.getElementById("reward-card");
const rewardGiftEl = rewardOverlay?.querySelector("[data-reward-gift]");
const rewardPetEl = rewardOverlay?.querySelector("[data-reward-pet]");
const rewardOpenBtn = rewardOverlay?.querySelector("[data-reward-open]");
const rewardCloseBtn = rewardOverlay?.querySelector("[data-reward-close]");
const rewardTitleEl = rewardOverlay?.querySelector(".reward-title");
const rewardTextEl = rewardOverlay?.querySelector(".reward-text");
const quizConfirmOverlay = document.getElementById("quiz-confirm");
const quizConfirmTitle = quizConfirmOverlay?.querySelector("[data-confirm-title]");
const quizConfirmText = quizConfirmOverlay?.querySelector("[data-confirm-text]");
const quizConfirmCancel = quizConfirmOverlay?.querySelector("[data-confirm-cancel]");
const quizConfirmAccept = quizConfirmOverlay?.querySelector("[data-confirm-accept]");
let lastRewardFocus = null;
let rewardOpenHandler = null;
let rewardCloseHandler = null;
let rewardBackdropHandler = null;
let rewardKeydownHandler = null;
let rewardGiftHandler = null;
let rewardOnOpenCallback = null;
let rewardOnCloseCallback = null;
let rewardCurrentData = null;
let rewardRevealTimeout = null;
let rewardConfettiTimeout = null;
let lastParentFocus = null;

const MODE_CONFIG = [
  { id: "sound", label: "🔊", title: "Nghe phát âm" },
  { id: "vi", label: "VI", title: "Tiếng Việt" },
  { id: "en", label: "EN", title: "English" },
  { id: "cz", label: "CZ", title: "Tiếng Czech" },
];

function safeText(text) {
  return text || "";
}

function focusParentPanel() {
  const focusable = parentBody?.querySelector(
    "input, button, [href], select, textarea, [tabindex]:not([tabindex='-1'])"
  );
  if (focusable) {
    focusable.focus();
  } else {
    parentCloseBtn?.focus();
  }
}

function closeParentPanel(onClose) {
  parentOverlay.hidden = true;
  onClose();
  if (lastParentFocus && typeof lastParentFocus.focus === "function") {
    lastParentFocus.focus();
  }
}

export function toggleLessonScreen(show) {
  if (!homeScreen || !lessonScreen) return;
  homeScreen.dataset.visible = show ? "false" : "true";
  lessonScreen.dataset.visible = show ? "true" : "false";
}

const TOPIC_ICON_MAP = {
  animals: "🐶",
  colors: "🎨",
  numbers: "🔢",
  food: "🍎",
  family: "👨‍👩‍👧",
  body: "🖐️",
  home: "🏠",
};

export function updateLessonTitle(topic) {
  if (!lessonTitleEl) return;
  if (!topic) {
    lessonTitleEl.textContent = "Chọn một chủ đề";
    lessonTitleEl.removeAttribute("aria-label");
    return;
  }
  const icon = TOPIC_ICON_MAP[topic.id] || "✨";
  lessonTitleEl.innerHTML = `
    <span class="lesson-title__icon" aria-hidden="true">${icon}</span>
  `;
  lessonTitleEl.setAttribute("aria-label", topic.title);
}

export function bindLessonNavigation(handler) {
  lessonBackBtn?.addEventListener("click", handler);
}

export function renderModeSwitch(currentMode) {
  if (!modeSwitchEl) return;
  modeSwitchEl.innerHTML = MODE_CONFIG.map(
    (mode) => `
      <button class="mode-icon" data-mode="${mode.id}" data-active="${mode.id === currentMode}" aria-pressed="${mode.id === currentMode}" title="${mode.title}">
        <span aria-hidden="true">${mode.label}</span>
      </button>
    `
  ).join("");
}

export function bindModeChange(handler) {
  modeSwitchEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    const mode = button.dataset.mode;
    handler(mode);
  });
}

export function renderPlayerControls({ isPlaying }) {
  if (!playerControlsEl) return;
  playerControlsEl.innerHTML = `
    <button data-autoplay data-state="${isPlaying ? "playing" : "paused"}">
      ${isPlaying ? "⏸️" : "▶️"} Autoplay
    </button>
    <button data-random>🎲 Ngẫu nhiên</button>
  `;
}

export function bindPlayerControlsPanel({ onToggleAutoplay, onRandom }) {
  playerControlsEl?.addEventListener("click", (event) => {
    const autoplayBtn = event.target.closest("[data-autoplay]");
    if (autoplayBtn) {
      onToggleAutoplay();
      return;
    }
    const randomBtn = event.target.closest("[data-random]");
    if (randomBtn) {
      onRandom();
    }
  });
}

const TOPIC_COLORS = ["#ffe7d6", "#fff3c7", "#dff2ff", "#eaf8f0"];

export function renderTopics(topics, currentTopicId) {
  if (!topicsGrid) return;

  if (!topics.length) {
    topicsGrid.innerHTML = `
      <p class="empty-state">Chưa có chủ đề nào. Vui lòng thử lại sau.</p>
    `;
    return;
  }

  topicsGrid.innerHTML = topics
    .map((topic, index) => {
      const isActive = topic.id === currentTopicId;
      const bg = TOPIC_COLORS[index % TOPIC_COLORS.length];
      return `
        <article class="topic-card ${isActive ? "topic-card--active" : ""}" data-topic="${topic.id}" style="background:${bg}">
          <div class="topic-card__icon-wrapper" role="presentation">
            <span class="topic-card__icon">${topic.icon || "📚"}</span>
          </div>
          <div class="topic-card__content" aria-live="polite">
            <h3>${topic.title}</h3>
            <p>${topic.description}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

export function bindTopicSelection(handler) {
  topicsGrid?.addEventListener("click", (event) => {
    const card = event.target.closest(".topic-card");
    if (!card) return;
    const topicId = card.dataset.topic;
    handler(topicId);
  });
}

export function showSelectedTopic(topic) {
  if (!selectedTopicEl) return;
  if (!topic) {
    selectedTopicEl.innerHTML = `
      <div class="placeholder-panel">
        <p>Chưa có chủ đề nào được chọn.</p>
        <p>Chọn một chủ đề để xem lưới từ vựng.</p>
      </div>
    `;
    itemsGridEl.innerHTML = "";
    return;
  }

  selectedTopicEl.innerHTML = "";
}

export function renderItems(items, currentItemId, currentMode, labelText = "Chọn mục khác") {
  if (!itemsGridEl) return;

  if (items === null) {
    itemsGridEl.innerHTML = `
      <div class="loading-panel" role="status" aria-live="assertive">
        <div class="loading-panel__spinner" aria-hidden="true"></div>
        <p class="loading-panel__text">Đang tải chủ đề...</p>
      </div>
    `;
    return;
  }

  if (items instanceof Error) {
    itemsGridEl.innerHTML = `
      <div class="placeholder-panel" role="status">
        <p>Không tải được dữ liệu. Vui lòng thử lại.</p>
      </div>
    `;
    return;
  }

  if (!items.length) {
    itemsGridEl.innerHTML = `
      <div class="placeholder-panel">
        <p>Chủ đề này chưa có từ vựng.</p>
      </div>
    `;
    return;
  }

  itemsGridEl.innerHTML = `
    <p class="items-grid__label">${labelText}</p>
    <div class="items-grid" role="list">
      ${items
        .map((item) => {
          const isActive = item.id === currentItemId;
          return `
            <button class="item-card ${isActive ? "item-card--active" : ""}" data-item="${item.id}" role="listitem" aria-pressed="${isActive ? "true" : "false"}">
              <div class="item-card__image">
                ${getItemVisualMarkup(item, { className: "item-card__visual" })}
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function bindItemSelection(handler) {
  itemsGridEl?.addEventListener("click", (event) => {
    const card = event.target.closest(".item-card");
    if (!card) return;
    const itemId = card.dataset.item;
    handler(itemId);
  });
}

export function renderPlayer(item, currentMode) {
  if (!detailPanelEl) return;
  if (!item) {
    detailPanelEl.innerHTML = `
      <div class="placeholder-panel">
        <p>Chạm vào một từ để nghe cách đọc nhé!</p>
        <button class="play-button" data-play disabled aria-disabled="true">🔊 Nghe phát âm</button>
      </div>
    `;
    return;
  }

  const title = getItemLabel(item, currentMode);

  detailPanelEl.innerHTML = `
    <div class="item-detail__card" data-detail-swipe>
      <button class="item-detail__visual-button" data-play>
        <div class="item-detail__art">
          ${getItemVisualMarkup(item, { className: "item-detail__visual", alt: title })}
        </div>
      </button>
      <p class="item-detail__title">${title}</p>
    </div>
  `;
}

export function bindPlayerControls(handler) {
  detailPanelEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-play]");
    if (!button) return;
    handler();
  });
}

export function bindDetailSwipe(handler) {
  if (!detailPanelEl || typeof handler !== "function") return;
  let startX = 0;
  let startY = 0;
  let isTouching = false;
  const swipeTargetSelector = "[data-detail-swipe]";

  const getTarget = () => detailPanelEl.querySelector(swipeTargetSelector) || detailPanelEl;

  detailPanelEl.addEventListener("touchstart", (event) => {
    const target = event.touches[0].target.closest(swipeTargetSelector);
    if (!target || event.touches.length !== 1) return;
    isTouching = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  });

  detailPanelEl.addEventListener("touchmove", (event) => {
    if (!isTouching) return;
    const deltaX = Math.abs(event.touches[0].clientX - startX);
    const deltaY = Math.abs(event.touches[0].clientY - startY);
    if (deltaY > deltaX) {
      isTouching = false;
    }
  });

  detailPanelEl.addEventListener("touchend", (event) => {
    if (!isTouching) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    const threshold = 50;
    if (Math.abs(deltaX) >= threshold) {
      handler(deltaX < 0 ? "left" : "right");
    }
    isTouching = false;
  });

  detailPanelEl.addEventListener("touchcancel", () => {
    isTouching = false;
  });
}

export function bindQuizToggle(handler) {
  quizToggleBtn?.addEventListener("click", () => {
    handler();
  });
}

export function showQuizConfirm({ title, text, cancelLabel, acceptLabel, onAccept, onCancel }) {
  if (!quizConfirmOverlay) return;
  quizConfirmTitle.textContent = title;
  quizConfirmText.textContent = text;
  quizConfirmCancel.textContent = cancelLabel;
  quizConfirmAccept.textContent = acceptLabel;
  quizConfirmOverlay.hidden = false;
  const cleanup = () => {
    quizConfirmOverlay.hidden = true;
    quizConfirmCancel.removeEventListener("click", onCancelClick);
    quizConfirmAccept.removeEventListener("click", onAcceptClick);
  };
  const onCancelClick = () => {
    cleanup();
    onCancel?.();
  };
  const onAcceptClick = () => {
    cleanup();
    onAccept?.();
  };
  quizConfirmCancel.addEventListener("click", onCancelClick);
  quizConfirmAccept.addEventListener("click", onAcceptClick);
}

export function setQuizVisibility(isVisible) {
  if (!quizSectionEl || !quizToggleBtn) return;
  quizToggleBtn.setAttribute("aria-expanded", isVisible ? "true" : "false");
  quizSectionEl.hidden = !isVisible;
}

export function renderQuiz({ questionText, answers, scoreLabel, feedbackText, disabled, hasEnoughItems, rewardPill, rewardRow }) {
  if (!quizSectionEl) return;
  if (!hasEnoughItems) {
    quizSectionEl.innerHTML = `
      <div class="quiz">
        <p>Chủ đề này cần ít nhất 3 từ để chơi quiz.</p>
      </div>
    `;
    return;
  }

  quizSectionEl.innerHTML = `
    <div class="quiz" role="region" aria-live="polite">
      <div class="quiz__header">
        <h3 class="quiz__title">Quiz</h3>
        <span class="quiz__score">${scoreLabel || ""}</span>
      </div>
      <p class="quiz__question">${questionText || ""}</p>
      ${rewardRow || ""}
      <div class="quiz__answers" role="list">
        ${answers
          .map(
            (ans) => `
              <button class="quiz-answer quiz-answer--image ${ans.state || ""}" data-answer="${ans.id}" ${disabled ? "disabled" : ""} aria-pressed="${ans.state ? "true" : "false"}">
                <div class="quiz-answer__image" data-answer-img>
                  ${getItemVisualMarkup(ans, { className: "quiz-answer__visual" })}
                </div>
              </button>
            `
          )
          .join("")}
      </div>
      <p class="quiz__feedback" aria-live="polite">${feedbackText || ""}</p>
      ${rewardPill ? `<div class="quiz__reward-pill">${rewardPill}</div>` : ""}
    </div>
  `;
}

export function bindQuizHandlers({ onAnswer }) {
  quizSectionEl?.addEventListener("click", (event) => {
    const answerBtn = event.target.closest(".quiz-answer");
    if (answerBtn) {
      const id = answerBtn.dataset.answer;
      onAnswer(id);
    }
  });
}

export function renderParentPanel(settings) {
  if (!parentBody) return;
  const { showEn, showCz, autoplayEnabled, autoplaySpeed, quizScore, trigger } = settings;
  parentOverlay.hidden = false;
  lastParentFocus = trigger || document.activeElement;
  parentBody.innerHTML = `
    <div class="parent-group">
      <label>Hiện tiếng Anh</label>
      <input type="checkbox" data-parent-toggle="en" ${showEn ? "checked" : ""} />
    </div>
    <div class="parent-group">
      <label>Hiện tiếng Czech</label>
      <input type="checkbox" data-parent-toggle="cz" ${showCz ? "checked" : ""} />
    </div>
    <div class="parent-group">
      <label>Tự động phát (autoplay)</label>
      <input type="checkbox" data-parent-toggle="autoplay" ${autoplayEnabled ? "checked" : ""} />
    </div>
    <div class="parent-group">
      <label>Tốc độ autoplay</label>
      <input class="parent-slider" type="range" min="1500" max="5000" step="500" value="${autoplaySpeed}" data-parent-slider />
    </div>
    <button class="parent-reset-btn" data-parent-reset>Reset điểm quiz (${quizScore})</button>
  `;
  focusParentPanel();
}

export function bindParentPanel({ onClose, onToggle, onSlider, onReset, canOpen }) {
  parentCloseBtn?.addEventListener("click", () => {
    closeParentPanel(onClose);
  });

  parentOverlay?.addEventListener("click", (event) => {
    if (event.target === parentOverlay) {
      closeParentPanel(onClose);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !parentOverlay.hidden) {
      event.preventDefault();
      closeParentPanel(onClose);
    }
  });

  parentBody?.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-parent-toggle]");
    if (toggle) {
      const type = toggle.dataset.parentToggle;
      onToggle(type, toggle.checked);
    }
    const slider = event.target.closest("[data-parent-slider]");
    if (slider) {
      onSlider(Number(slider.value));
    }
  });

  parentBody?.addEventListener("click", (event) => {
    const resetBtn = event.target.closest("[data-parent-reset]");
    if (resetBtn) {
      onReset();
    }
  });

  return {
    open: (settings) => {
      if (canOpen && !canOpen()) return;
      renderParentPanel(settings);
    },
  };
}

function getItemLabel(item, mode) {
  if (mode === "sound") return item.name_vi;
  if (mode === "en") return item.name_en || item.name_vi;
  if (mode === "cz") return item.name_cz || item.name_vi;
  return item.name_vi;
}

function getSubtitle(item, mode) {
  if (mode === "sound") return "Chạm để nghe âm thanh tự nhiên";
  if (mode === "en") return item.name_vi;
  if (mode === "cz") return item.name_vi;
  return `${item.name_en} · ${item.name_cz}`;
}

function modeLabel(mode) {
  const config = MODE_CONFIG.find((entry) => entry.id === mode);
  return config?.title || "Chế độ";
}

function focusRewardCard() {
  const focusable = rewardCardEl?.querySelector(
    "button, [href], [tabindex]:not([tabindex='-1'])"
  );
  if (focusable) {
    focusable.focus();
  } else {
    rewardCloseBtn?.focus();
  }
}

function cleanupRewardListeners() {
  if (rewardOpenHandler) {
    rewardOpenBtn?.removeEventListener("click", rewardOpenHandler);
    rewardOpenHandler = null;
  }
  if (rewardGiftHandler) {
    rewardGiftEl?.removeEventListener("animationend", rewardGiftHandler);
    rewardGiftHandler = null;
  }
  if (rewardCloseHandler) {
    rewardCloseBtn?.removeEventListener("click", rewardCloseHandler);
    rewardCloseHandler = null;
  }
  if (rewardBackdropHandler) {
    rewardOverlay?.removeEventListener("click", rewardBackdropHandler);
    rewardBackdropHandler = null;
  }
  if (rewardKeydownHandler) {
    document.removeEventListener("keydown", rewardKeydownHandler);
    rewardKeydownHandler = null;
  }
}

function resetRewardCard() {
  rewardGiftEl?.classList.remove("reward-gift--open");
  rewardPetEl?.classList.add("is-hidden");
  rewardPetEl?.setAttribute("hidden", "hidden");
  rewardPetEl?.classList.remove("reward-pet--celebrate");
  if (rewardRevealTimeout) {
    clearTimeout(rewardRevealTimeout);
    rewardRevealTimeout = null;
  }
  if (rewardConfettiTimeout) {
    clearTimeout(rewardConfettiTimeout);
    rewardConfettiTimeout = null;
  }
}

function setupVisualFallbacks() {
  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.matches("[data-visual-img]")) return;
      img.dataset.failed = "true";
      img.hidden = true;
      const wrapper = img.closest("[data-visual-stack]");
      if (!wrapper) return;
      const nextImg = Array.from(wrapper.querySelectorAll("[data-visual-img]"))
        .find((node) => node !== img && node.dataset.failed !== "true");
      if (nextImg) {
        nextImg.hidden = false;
        return;
      }
      let fallback = wrapper.querySelector("[data-fallback]");
      if (!fallback) {
            const fallbackCls = wrapper.dataset.fallbackClass || "item-visual__fallback";
        fallback = document.createElement("span");
        fallback.dataset.fallback = "true";
        fallback.setAttribute("aria-hidden", "true");
        fallback.className = fallbackCls;
        fallback.textContent = wrapper.dataset.fallbackEmoji || "✨";
        wrapper.appendChild(fallback);
      }
      fallback.classList.remove("is-hidden");
    },
    true
  );
}

setupVisualFallbacks();

function getSafeEmoji(item) {
  return safeText(item?.emoji || "✨");
}

function getItemVisualMarkup(item, { className = "", alt = "", fallbackClass = "" } = {}) {
  const emoji = getSafeEmoji(item);
  const variants = item?.imageVariants && item.imageVariants.length ? item.imageVariants : item?.image ? [item.image] : [];
  const pngVariants = variants.map((path) => path.replace(/\.[^.]+$/, ".png"));
  const sources = pngVariants.length ? pngVariants : variants;
  const safeAlt = safeText(alt || item?.name_vi || "");
  const fallbackCls = fallbackClass || (className ? className.replace("__visual", "__fallback") : "item-visual__fallback");
  if (sources.length) {
    const imagesMarkup = sources
      .map(
        (src, index) => `
          <img src="${src}" alt="${safeAlt}" class="${className || "item-detail__visual"}" loading="lazy" ${index === 0 ? "" : "hidden"} data-visual-img />
        `
      )
      .join("\n");
    return `
      <span class="item-visual-stack">
        ${imagesMarkup}
      </span>
    `;
  }
  return "";
}

function renderRewardPopupContent({ title, icon, text }) {
  if (rewardTitleEl) {
    rewardTitleEl.textContent = title || "Hộp quà đặc biệt";
  }
  if (rewardGiftEl) {
    rewardGiftEl.textContent = icon || "🎁";
  }
  if (rewardTextEl) {
    rewardTextEl.textContent = text || "Cùng mở quà bất ngờ nhé!";
  }
}

export function hideRewardPopupUI() {
  rewardOverlay.hidden = true;
  cleanupRewardListeners();
  resetRewardCard();
  rewardOnCloseCallback?.(rewardCurrentData);
  rewardOnCloseCallback = null;
  rewardOnOpenCallback = null;
  rewardCurrentData = null;
  if (lastRewardFocus && typeof lastRewardFocus.focus === "function") {
    lastRewardFocus.focus();
  }
}

export function showRewardPopupUI({ icon, title, description, openLabel, closeLabel, reward, onOpenGift, onClose }) {
  if (!rewardOverlay || !rewardCardEl) return;
  cleanupRewardListeners();
  resetRewardCard();
  rewardOverlay.hidden = false;
  rewardCurrentData = reward;
  rewardOnOpenCallback = onOpenGift;
  rewardOnCloseCallback = onClose;
  lastRewardFocus = document.activeElement;
  renderRewardPopupContent({
    title,
    icon,
    text: description,
  });
  if (rewardOpenBtn) {
    rewardOpenBtn.textContent = openLabel || "Open";
  }
  if (rewardCloseBtn) {
    rewardCloseBtn.textContent = closeLabel || "Close";
  }
  rewardOpenBtn?.removeAttribute("disabled");
  rewardPetEl?.setAttribute("hidden", "hidden");
  rewardPetEl?.classList.add("is-hidden");

  rewardOpenHandler = () => {
    rewardOpenBtn?.setAttribute("disabled", "disabled");
    rewardGiftEl?.classList.add("reward-gift--open");
    rewardRevealTimeout = window.setTimeout(() => {
      rewardOnOpenCallback?.(reward);
    }, 400);
  };

  rewardGiftHandler = () => {
    rewardPetEl?.removeAttribute("hidden");
    rewardPetEl?.classList.remove("is-hidden");
    rewardPetEl?.classList.add("reward-pet--celebrate");
    rewardConfettiTimeout = window.setTimeout(() => {
      rewardPetEl?.classList.remove("reward-pet--celebrate");
    }, 2000);
  };

  rewardCloseHandler = () => {
    hideRewardPopupUI();
  };

  rewardBackdropHandler = (event) => {
    if (event.target === rewardOverlay) {
      hideRewardPopupUI();
    }
  };

  rewardKeydownHandler = (event) => {
    if (event.key === "Escape" && !rewardOverlay.hidden) {
      event.preventDefault();
      hideRewardPopupUI();
    }
  };

  rewardOpenBtn?.addEventListener("click", rewardOpenHandler);
  rewardGiftEl?.addEventListener("animationend", rewardGiftHandler);
  rewardCloseBtn?.addEventListener("click", rewardCloseHandler);
  rewardOverlay?.addEventListener("click", rewardBackdropHandler);
  document.addEventListener("keydown", rewardKeydownHandler);

  focusRewardCard();
}
