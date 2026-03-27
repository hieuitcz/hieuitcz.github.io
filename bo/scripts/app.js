import { fetchTopics, fetchTopicItems } from "./dataLoader.js";
import {
  renderTopics,
  bindTopicSelection,
  showSelectedTopic,
  renderItems,
  bindItemSelection,
  renderPlayer,
  bindPlayerControls,
  renderModeSwitch,
  bindModeChange,
  renderPlayerControls,
  bindPlayerControlsPanel,
  renderQuiz,
  bindQuizHandlers,
  toggleLessonScreen,
  updateLessonTitle,
  bindLessonNavigation,
  bindParentPanel,
  bindQuizToggle,
  setQuizVisibility,
  bindDetailSwipe,
  showRewardPopupUI,
  hideRewardPopupUI,
  showQuizConfirm,
} from "./ui.js";
import { playItemSound, stopCurrentAudio } from "./player.js";
import { canPlayQuiz, generateQuestion, checkAnswer } from "./quiz.js";

console.log("Học cùng Bơ Phase 9 đang chạy");

const startBtn = document.getElementById("start-learning");
const playground = document.getElementById("playground");
const statusBadge = document.querySelector(".badge");
const parentTrigger = document.getElementById("parent-trigger");
const parentOverlay = document.getElementById("parent-overlay");
const lessonScreen = document.getElementById("lesson-screen");

const MODE_STORAGE_KEY = "hoc-cung-bo-mode";
const PARENT_STORAGE_KEY = "hoc-cung-bo-parent";

const imageCache = new Set();
const audioCache = new Set();

let topicsData = [];
let currentTopicId = null;
let currentItems = [];
let currentItemId = null;
let parentSettings = loadParentSettings();
let currentMode = parentSettings.defaultMode || "sound";
let autoplayTimer = null;
let autoplayIndex = 0;
let autoplaySpeed = parentSettings.autoplaySpeed || 3000;
let isAutoplaying = parentSettings.autoplayEnabled ?? false;
let isQuizVisible = false;
const PREFETCH_CONCURRENCY = 3;
const PRELOAD_TIMEOUT = 8000;

const QUIZ_REWARD_MILESTONES = [
  { score: 5, icon: "🌟" },
  { score: 10, icon: "🍀" },
  { score: 15, icon: "🦄" },
  { score: 20, icon: "🎁" },
];

const MODE_LANG_MAP = {
  sound: "vi-VN",
  vi: "vi-VN",
  en: "en-US",
  cz: "cs-CZ",
};

const QUIZ_COPY = {
  vi: {
    question: (word) => `Đâu là ${word}?`,
    instruction: "Chạm vào hình đúng nhé!",
    scoreLabel: (score) => `Điểm: ${score}`,
    feedbackPositive: [
      "Tuyệt vời! Bé trả lời đúng rồi!",
      "Giỏi quá! Chính xác luôn!",
      "Hay lắm! Bé chọn đúng rồi!",
      "Xuất sắc! Đúng mất rồi!",
      "Siêu quá! Bé làm đúng rồi!",
    ],
    feedbackNegative: [
      "Sai rồi, cố lên nhé!",
      "Gần đúng rồi, thử lại nào!",
      "Chưa đúng đâu, mình chọn lại nhé!",
      "Không sao, bé thử lại nha!",
      "Sắp đúng rồi, cùng thử tiếp nào!",
    ],
    reward: {
      milestoneText: {
        5: "Sticker Sao vàng",
        10: "Sticker Lá may mắn",
        15: "Sticker Kỳ lân",
        20: "Hộp quà đặc biệt",
      },
      pillPrefix: "Phần thưởng",
      popup: {
        title: "Hộp quà của bé",
        description: "Bé mở sticker đáng yêu nào!",
        openLabel: "Mở quà",
        closeLabel: "Đóng",
      },
    },
  },
  en: {
    question: (word) => `Where is ${word}?`,
    instruction: "Tap the correct picture!",
    scoreLabel: (score) => `Score: ${score}`,
    feedbackPositive: [
      "Awesome! You picked the right one!",
      "Great job! That's correct!",
      "Nice! You got it right!",
      "Amazing! That's the match!",
      "Super! You chose correctly!",
    ],
    feedbackNegative: [
      "Not yet, try again!",
      "Close! Give it another go!",
      "Oops, let's pick again!",
      "It's okay, try one more time!",
      "Almost! Let's keep trying!",
    ],
    reward: {
      milestoneText: {
        5: "Golden star sticker",
        10: "Lucky clover sticker",
        15: "Unicorn sticker",
        20: "Special gift box",
      },
      pillPrefix: "Reward",
      popup: {
        title: "Your surprise box",
        description: "Open it to meet a cute friend!",
        openLabel: "Open gift",
        closeLabel: "Close",
      },
    },
  },
  cz: {
    question: (word) => `Kde je ${word}?`,
    instruction: "Dotkni se správného obrázku!",
    scoreLabel: (score) => `Skóre: ${score}`,
    feedbackPositive: [
      "Skvělé! Vybral/a jsi správně!",
      "Výborně! To je správně!",
      "Paráda! Trefil/a ses!",
      "Úžasné! To je ono!",
      "Super! Vybral/a jsi dobře!",
    ],
    feedbackNegative: [
      "Zatím ne, zkus to znovu!",
      "Blízko! Zkus to ještě jednou!",
      "Ups, vyberme znovu!",
      "Nevadí, zkus to ještě!",
      "Skoro! Pokračujme dál!",
    ],
    reward: {
      milestoneText: {
        5: "Samolepka Zlatá hvězda",
        10: "Samolepka Čtyřlístek",
        15: "Samolepka Jednorožec",
        20: "Speciální dárková krabička",
      },
      pillPrefix: "Odměna",
      popup: {
        title: "Dárková krabička",
        description: "Otevři ji a potkej roztomilé zvířátko!",
        openLabel: "Otevřít",
        closeLabel: "Zavřít",
      },
    },
  },
};

function getModeLang(mode) {
  return MODE_LANG_MAP[mode] || "vi-VN";
}

function getModeCopy(mode = currentMode) {
  return QUIZ_COPY[mode] || QUIZ_COPY.vi;
}

function getLocalizedLabel(item, mode = currentMode) {
  if (!item) return "";
  if (mode === "en") return item.name_en || item.label_en || item.name_vi || item.label || "";
  if (mode === "cz") return item.name_cz || item.label_cz || item.name_vi || item.label || "";
  return item.name_vi || item.label || "";
}

function getLocalizedPrompt(item, mode = currentMode) {
  const copy = getModeCopy(mode);
  const label = getLocalizedLabel(item, mode);
  const placeholder = label || (mode === "en" ? "the word" : mode === "cz" ? "slovo" : "từ vựng");
  const text = copy.question(placeholder);
  return {
    text,
    lang: getModeLang(mode),
  };
}

function addRewardIfNeeded() {
  const newReward = QUIZ_REWARD_MILESTONES.find(
    (milestone) => milestone.score === quizState.score
  );
  if (!newReward) return;
  const alreadyEarned = quizState.rewards.some((reward) => reward.score === newReward.score);
  if (alreadyEarned) return;
  quizState.rewards.push(newReward);
  const copy = getModeCopy(currentMode);
  const rewardLabel = copy.reward.milestoneText[newReward.score] || "";
  quizState.rewardFlash = `${copy.reward.pillPrefix}: ${newReward.icon} ${rewardLabel}`;
  if (rewardFlashTimer) {
    clearTimeout(rewardFlashTimer);
  }
  rewardFlashTimer = setTimeout(() => {
    quizState.rewardFlash = "";
    rewardFlashTimer = null;
    const payload = buildQuizRenderPayload({
      answers: quizState.question.answers.map((ans) => ({ ...ans, state: ans.state || "" })),
      feedback: quizState.disabled ? null : null,
      disabled: quizState.disabled,
    });
    renderQuiz(payload);
  }, 2500);
  if (newReward.score === 20 && !quizState.rewardPopupShown) {
    quizState.rewardPopupShown = true;
    showRewardPopupUI({
      icon: "🐾",
      title: copy.reward.popup.title,
      description: copy.reward.popup.description,
      openLabel: copy.reward.popup.openLabel,
      closeLabel: copy.reward.popup.closeLabel,
      reward: newReward,
      onOpenGift: () => handleRewardGiftReveal(newReward),
      onClose: hideRewardPopupUI,
    });
  }
}

function handleRewardGiftReveal(newReward) {
  playAnimalSound(quizState.question?.correct || null);
}

function getRewardsRow(mode = currentMode) {
  const copy = getModeCopy(mode);
  const milestones = QUIZ_REWARD_MILESTONES.map((milestone) => {
    const earned = quizState.rewards.some((reward) => reward.score === milestone.score);
    const itemClass = earned ? "quiz-reward quiz-reward--earned" : "quiz-reward";
    const label = copy.reward.milestoneText[milestone.score] || "";
    return `<span class="${itemClass}" aria-label="${label}">${milestone.icon}</span>`;
  });
  return `<div class="quiz__reward-row">${milestones.join("")}</div>`;
}

function getLatestRewardMessage(mode = currentMode) {
  if (!quizState.rewards.length) return "";
  const latest = quizState.rewards[quizState.rewards.length - 1];
  const copy = getModeCopy(mode);
  const label = copy.reward.milestoneText[latest.score] || "";
  return `${latest.icon} ${label}`;
}

let parentPressedTimeout = null;

let quizState = {
  question: null,
  score: 0,
  disabled: false,
  rewards: [],
  rewardPopupShown: false,
  rewardFlash: "",
};
let rewardFlashTimer = null;
let quizQuestionAudioToken = 0;

function confirmQuitQuiz() {
  let title = "Thoát sẽ mất điểm";
  let text = "Chơi lại từ đầu";
  let stay = "Tiếp tục chơi";
  let exit = "Thoát quiz";
  if (currentMode === "en") {
    title = "Leaving will reset score";
    text = "Restart from the beginning";
    stay = "Keep playing";
    exit = "Exit quiz";
  } else if (currentMode === "cz") {
    title = "Odchod vymaže skóre";
    text = "Začni znovu od začátku";
    stay = "Pokračovat";
    exit = "Opustit kvíz";
  }
  return new Promise((resolve) => {
    showQuizConfirm({
      title,
      text,
      cancelLabel: stay,
      acceptLabel: exit,
      onAccept: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

async function handleQuizToggle() {
  if (isQuizVisible) {
    const confirmed = await confirmQuitQuiz();
    if (!confirmed) return;
    exitQuizSession();
    return;
  }
  isQuizVisible = true;
  setQuizVisibility(true);
  toggleQuizView(true);
  stopAutoplay();
  if (canPlayQuiz(currentItems)) {
    setupQuiz();
  } else {
    renderQuiz({ hasEnoughItems: false });
  }
}

function exitQuizSession() {
  stopCurrentAudio();
  clearNextQuestionTimer();
  cancelQuizSpeech();
  resetQuizProgress();
  isQuizVisible = false;
  setQuizVisibility(false);
  toggleQuizView(false);
}

startBtn?.addEventListener("click", () => {
  playground.scrollIntoView({ behavior: "smooth" });
});

parentTrigger?.addEventListener("pointerdown", () => {
  parentPressedTimeout = setTimeout(() => {
    openParentPanel(parentTrigger);
  }, 2000);
});

parentTrigger?.addEventListener("pointerup", () => {
  clearTimeout(parentPressedTimeout);
});

const parentPanel = bindParentPanel({
  onClose: handleParentClose,
  onToggle: handleParentToggle,
  onSlider: handleParentSlider,
  onReset: handleParentReset,
  canOpen: () => lessonScreen?.dataset.visible === "true",
});

bindModeChange((mode) => {
  if (!isLanguageEnabled(mode)) {
    currentMode = "sound";
  } else {
    currentMode = mode;
  }
  localStorage.setItem(MODE_STORAGE_KEY, currentMode);
  renderModeSwitchWithPermissions();
  renderItems(currentItems, currentItemId, currentMode, getGridLabel(currentTopicId));
  const item = currentItems.find((i) => i.id === currentItemId);
  renderPlayer(item, currentMode);
});

renderModeSwitchWithPermissions();
renderModeSwitch(currentMode);

bindQuizHandlers({
  onAnswer: (answerId) => {
    if (!quizState.question || quizState.disabled) return;
    clearNextQuestionTimer();
    cancelQuizSpeech();
    const result = checkAnswer(quizState.question, answerId);
    quizState.disabled = true;
    renderQuizUI(result.correct ? answerId : quizState.question.correctId, answerId);
  },
});

bindPlayerControlsPanel({
  onToggleAutoplay: () => {
    if (!currentItems.length) return;
    isAutoplaying = !isAutoplaying;
    parentSettings.autoplayEnabled = isAutoplaying;
    saveParentSettings();
    renderPlayerControls({ isPlaying: isAutoplaying });
    if (isAutoplaying) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
  },
  onRandom: () => {
    if (!currentItems.length) return;
    const nextItem = pickRandomItem();
    if (nextItem) {
      selectItem(nextItem.id, { playSound: true });
    }
  },
});

bindTopicSelection(async (topicId) => {
  await enterLesson(topicId);
});

bindItemSelection((itemId) => {
  const item = selectItem(itemId, { playSound: true });
  if (!item) return;
});

bindPlayerControls(() => {
  const item = currentItems.find((i) => i.id === currentItemId);
  if (item) {
    playItemSound(item, currentMode);
  }
});

function handleSwipeOnDetail(direction) {
  if (!currentItems.length || isQuizVisible || !lessonScreen || lessonScreen.dataset.visible !== "true") {
    return;
  }
  if (direction === "left") {
    goToNextItem();
  } else if (direction === "right") {
    goToPreviousItem();
  }
}

function goToNextItem() {
  if (!currentItems.length) return;
  const currentIndex = currentItems.findIndex((item) => item.id === currentItemId);
  if (currentIndex === -1 || currentIndex === currentItems.length - 1) return;
  selectItem(currentItems[currentIndex + 1].id, { playSound: true });
}

function goToPreviousItem() {
  if (!currentItems.length) return;
  const currentIndex = currentItems.findIndex((item) => item.id === currentItemId);
  if (currentIndex <= 0) return;
  selectItem(currentItems[currentIndex - 1].id, { playSound: true });
}

bindDetailSwipe(handleSwipeOnDetail);

bindQuizToggle(() => {
  handleQuizToggle();
});

bindLessonNavigation(() => {
  stopAutoplay();
  exitQuizSession();
  toggleLessonScreen(false);
});

async function enterLesson(topicId) {
  currentTopicId = topicId;
  currentItemId = null;
  stopAutoplay();
  isAutoplaying = false;
  parentSettings.autoplayEnabled = false;
  saveParentSettings();
  resetQuizProgress();
  renderTopics(topicsData, currentTopicId);
  const selected = topicsData.find((t) => t.id === topicId);
  updateLessonTitle(selected);
  toggleLessonScreen(true);
  showSelectedTopic(selected);
  renderPlayer(null, currentMode);
  setQuizVisibility(false);
  isQuizVisible = false;
  await loadItems(selected);
  setupQuiz();
}

async function loadItems(topic) {
  if (!topic) {
    currentItems = [];
    renderItems([], null, currentMode, "Chọn mục khác");
    renderPlayer(null, currentMode);
    renderPlayerControls({ isPlaying: false });
    renderQuiz({ hasEnoughItems: false });
    return;
  }

  renderItems(null, null, currentMode);
  renderPlayer(null, currentMode);

  try {
    const items = await fetchTopicItems(topic.dataFile);
    currentItems = items.map((item) => {
      const base = {
        emoji: inferEmoji(topic.id),
        ...item,
      };
      const normalizedImage = normalizeAssetPath(base.image);
      const normalizedSound = normalizeAssetPath(base.sound);
      return {
        ...base,
        image: normalizedImage,
        sound: normalizedSound,
        imageVariants: buildAssetVariants(normalizedImage, IMAGE_EXTENSIONS),
        soundVariants: buildAssetVariants(normalizedSound, AUDIO_EXTENSIONS),
      };
    });
    preloadAssets(currentItems);
    autoplayIndex = 0;
    renderItems(currentItems, currentItemId, currentMode, getGridLabel(topic.id));
    renderPlayer(null, currentMode);
    renderPlayerControls({ isPlaying: false });
    autoSelectFirstItem();
  } catch (err) {
    console.error("Không tải được dữ liệu chủ đề", err);
    currentItems = [];
    renderItems(new Error("load-failed"), null, currentMode, getGridLabel(topic?.id));
    renderPlayer(null, currentMode);
    renderQuiz({ hasEnoughItems: false });
  }
}

function playAnimalSound(item, options = {}) {
  if (!item) return;
  playItemSound(item, "sound", options);
}

function getGridLabel(topicId) {
  const map = {
    animals: "Chọn con vật khác",
    colors: "Chọn màu sắc khác",
    numbers: "Chọn số khác",
    vehicles: "Chọn phương tiện khác",
    family: "Chọn thành viên khác",
    food: "Chọn món khác",
    body: "Chọn bộ phận khác",
    home: "Chọn đồ vật khác",
  };
  return map[topicId] || "Chọn mục khác";
}

function inferEmoji(topicId) {
  const fallback = "✨";
  const emojiMap = {
    animals: "🐾",
    colors: "🎨",
    numbers: "🔢",
    vehicles: "🚗",
    family: "👨‍👩‍👧",
    food: "🍎",
    body: "🖐️",
    home: "🏠",
  };
  return emojiMap[topicId] || fallback;
}

const IMAGE_EXTENSIONS = [".png"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg"];

function normalizeAssetPath(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

function buildAssetVariants(path, allowList) {
  if (!path) return [];
  const normalized = normalizeAssetPath(path);
  if (!normalized) return [];
  const lower = normalized.toLowerCase();
  const hasAllowed = hasAllowedExtension(lower, allowList);
  const stripped = normalized.replace(/\.[^.]+$/, "");
  const variants = [];
  const pushUnique = (value) => {
    if (!value || variants.includes(value)) return;
    variants.push(value);
  };
  if (hasAllowed) {
    pushUnique(normalized);
    allowList.forEach((ext) => {
      if (!lower.endsWith(ext)) {
        pushUnique(`${stripped}${ext}`);
      }
    });
    return variants;
  }
  allowList.forEach((ext) => pushUnique(`${stripped}${ext}`));
  return variants.length ? variants : [normalized];
}

function shouldPrefetchAsset(path, allowList, cacheSet) {
  if (!path) return false;
  const normalized = normalizeAssetPath(path);
  if (!normalized || cacheSet.has(normalized)) return false;
  return hasAllowedExtension(normalized, allowList);
}

function preloadAssets(items) {
  if (!Array.isArray(items) || !items.length) return;
  const tasks = [];

  items.forEach((item) => {
    const imagePath = normalizeAssetPath(item.image);
    const soundPath = normalizeAssetPath(item.sound);
    if (imagePath && !imageCache.has(imagePath) && hasAllowedExtension(imagePath, IMAGE_EXTENSIONS)) {
      tasks.push(() => preloadImage(imagePath));
    }
    if (soundPath && !audioCache.has(soundPath) && hasAllowedExtension(soundPath, AUDIO_EXTENSIONS)) {
      tasks.push(() => preloadAudio(soundPath));
    }
  });

  if (!tasks.length) return;

  let active = 0;
  const runNext = () => {
    if (!tasks.length) return;
    while (active < PREFETCH_CONCURRENCY && tasks.length) {
      const task = tasks.shift();
      active += 1;
      task()
        .catch(() => {})
        .finally(() => {
          active -= 1;
          runNext();
        });
    }
  };

  runNext();
}

function hasAllowedExtension(path, allowList) {
  if (!path) return false;
  const lower = path.toLowerCase();
  return allowList.some((ext) => lower.endsWith(ext));
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src || imageCache.has(src)) {
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = "async";
    let timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, PRELOAD_TIMEOUT);

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => {
      cleanup();
      resolve();
    };

    img.src = src;
  });
}

function preloadAudio(src) {
  return new Promise((resolve) => {
    if (!src || audioCache.has(src)) {
      resolve();
      return;
    }
    const audio = new Audio();
    audio.preload = "auto";
    let timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, PRELOAD_TIMEOUT);

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onDone);
    };

    const onReady = () => {
      cleanup();
      audioCache.add(src);
      resolve();
    };

    const onDone = () => {
      cleanup();
      resolve();
    };

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onDone, { once: true });
    audio.src = src;
    audio.load();
  });
}

function renderModeSwitchWithPermissions() {
  renderModeSwitch(currentMode);
  document.querySelectorAll("[data-mode]").forEach((btn) => {
    const mode = btn.dataset.mode;
    const enabled = isLanguageEnabled(mode);
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? 1 : 0.5;
    if (!enabled && mode === currentMode) {
      currentMode = "vi";
      btn.setAttribute("aria-pressed", "false");
    }
    btn.setAttribute("aria-pressed", mode === currentMode ? "true" : "false");
  });
}

function isLanguageEnabled(mode) {
  if (mode === "en") return parentSettings.showEn !== false;
  if (mode === "cz") return parentSettings.showCz !== false;
  return true;
}

function loadParentSettings() {
  try {
    const raw = localStorage.getItem(PARENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Không đọc được parent settings", e);
  }
  return {
    showEn: true,
    showCz: true,
    autoplayEnabled: false,
    autoplaySpeed: 3000,
  };
}

function saveParentSettings() {
  localStorage.setItem(PARENT_STORAGE_KEY, JSON.stringify(parentSettings));
}

function startAutoplay() {
  if (!currentItems.length) return;
  stopCurrentAudio();
  stopAutoplay(false);
  isAutoplaying = true;
  renderPlayerControls({ isPlaying: isAutoplaying });
  if (!currentItemId && currentItems.length) {
    const first = selectItem(currentItems[0].id);
    autoplayIndex = 0;
    if (first) {
      playItemSound(first, currentMode);
    }
  }
  autoplayTimer = setInterval(() => {
    if (!currentItems.length) return;
    autoplayIndex = (autoplayIndex + 1) % currentItems.length;
    const item = selectItem(currentItems[autoplayIndex].id);
    if (item) {
      playItemSound(item, currentMode);
    }
  }, autoplaySpeed);
}

function stopAutoplay(updateUI = true) {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
  if (updateUI) {
    isAutoplaying = false;
    renderPlayerControls({ isPlaying: false });
  }
}

function selectItem(itemId, { playSound = false } = {}) {
  currentItemId = itemId;
  autoplayIndex = currentItems.findIndex((i) => i.id === itemId);
  renderItems(currentItems, currentItemId, currentMode, getGridLabel(currentTopicId));
  const item = currentItems.find((i) => i.id === itemId);
  renderPlayer(item, currentMode);
  if (item && playSound) {
    playItemSound(item, currentMode);
  }
  return item;
}

function autoSelectFirstItem() {
  if (!currentItems.length) return;
  selectItem(currentItems[0].id, { playSound: true });
}

let quizSpeechUtterance = null;
let nextQuestionTimer = null;

function resetQuizProgress() {
  quizState.question = null;
  quizState.score = 0;
  quizState.disabled = false;
  quizState.rewards = [];
  quizState.rewardPopupShown = false;
  quizState.rewardFlash = "";
  if (rewardFlashTimer) {
    clearTimeout(rewardFlashTimer);
    rewardFlashTimer = null;
  }
  clearNextQuestionTimer();
  cancelQuizSpeech();
  hideRewardPopupUI();
}

function pickRandomItem() {
  if (!currentItems.length) return null;
  if (currentItems.length === 1) return currentItems[0];
  let candidate;
  do {
    candidate = currentItems[Math.floor(Math.random() * currentItems.length)];
  } while (candidate.id === currentItemId);
  return candidate;
}

function buildQuizRenderPayload({ answers, feedback, disabled }) {
  const copy = getModeCopy(currentMode);
  const questionLabel = getLocalizedLabel(quizState.question.correct, currentMode);
  return {
    questionText: copy.question(questionLabel),
    answers,
    scoreLabel: copy.scoreLabel(quizState.score),
    feedbackText: feedback || copy.instruction,
    disabled,
    hasEnoughItems: true,
    rewardRow: getRewardsRow(currentMode),
    rewardPill: quizState.rewardFlash,
  };
}

function setupQuiz() {
  quizState.disabled = false;
  clearNextQuestionTimer();
  cancelQuizSpeech();
  if (!canPlayQuiz(currentItems)) {
    quizState.question = null;
    renderQuiz({ hasEnoughItems: false });
    return;
  }
  quizState.question = generateQuestion(currentItems);
  const payload = buildQuizRenderPayload({
    answers: quizState.question.answers.map((ans) => ({ ...ans, state: "" })),
    feedback: null,
    disabled: false,
  });
  renderQuiz(payload);
  speakQuizQuestion();
}

function renderQuizUI(correctAnswerId, userAnswerId) {
  if (!quizState.question) return;
  const answers = quizState.question.answers.map((ans) => {
    if (ans.id === correctAnswerId) {
      return { ...ans, state: "correct" };
    }
    if (ans.id === userAnswerId && ans.id !== correctAnswerId) {
      return { ...ans, state: "incorrect" };
    }
    return ans;
  });
  const isCorrect = correctAnswerId === userAnswerId;
  if (isCorrect) {
    quizState.score += 1;
    addRewardIfNeeded();
  }
  const copy = getModeCopy(currentMode);
  const feedbackList = isCorrect ? copy.feedbackPositive : copy.feedbackNegative;
  const feedback = feedbackList[Math.floor(Math.random() * feedbackList.length)];
  const payload = buildQuizRenderPayload({
    answers,
    feedback,
    disabled: true,
  });
  renderQuiz(payload);
  speakQuizFeedback(feedback, () => scheduleNextQuestion());
}

function speakQuizQuestion() {
  if (!quizState.question) return;
  cancelQuizSpeech();
  stopCurrentAudio();
  if (!isQuizVisible) return;
  const prompt = getLocalizedPrompt(quizState.question.correct, currentMode);
  const token = Date.now();
  quizQuestionAudioToken = token;
  speakText(prompt.text, () => {
    if (quizQuestionAudioToken !== token) return;
    playAnimalSound(quizState.question.correct, { playOnlySound: true });
  }, prompt.lang);
}

function speakQuizFeedback(text, onend) {
  if (!text) {
    onend?.();
    return;
  }
  cancelQuizSpeech();
  speakText(text, onend, getModeLang(currentMode));
}

function speakText(text, onend, langOverride = "vi-VN") {
  if (!("speechSynthesis" in window)) {
    onend?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langOverride;
  if (typeof onend === "function") {
    utterance.onend = () => {
      quizSpeechUtterance = null;
      onend();
    };
  } else {
    utterance.onend = () => {
      quizSpeechUtterance = null;
    };
  }
  quizSpeechUtterance = utterance;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function scheduleNextQuestion() {
  if (!isQuizVisible) return;
  clearNextQuestionTimer();
  nextQuestionTimer = setTimeout(() => {
    nextQuestionTimer = null;
    setupQuiz();
  }, 2000);
}

function clearNextQuestionTimer() {
  if (nextQuestionTimer) {
    clearTimeout(nextQuestionTimer);
    nextQuestionTimer = null;
  }
}

function cancelQuizSpeech() {
  quizQuestionAudioToken += 1;
  if (quizSpeechUtterance) {
    quizSpeechUtterance.onend = null;
  }
  window.speechSynthesis?.cancel();
  quizSpeechUtterance = null;
}

function getReward(score, isCorrect) {
  if (!isCorrect) return null;
  const milestone = REWARD_MILESTONES.find((entry) => entry.score === score);
  return milestone || null;
}

function openParentPanel(trigger = document.activeElement) {
  renderParentPanel({
    showEn: parentSettings.showEn !== false,
    showCz: parentSettings.showCz !== false,
    autoplayEnabled: isAutoplaying,
    autoplaySpeed,
    quizScore: quizState.score,
    trigger,
  });
}

function handleParentClose() {}

function handleParentToggle(type, value) {
  if (type === "en") {
    parentSettings.showEn = value;
  } else if (type === "cz") {
    parentSettings.showCz = value;
  } else if (type === "autoplay") {
    parentSettings.autoplayEnabled = value;
    isAutoplaying = value;
    if (isAutoplaying) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
  }
  saveParentSettings();
  renderModeSwitchWithPermissions();
}

function handleParentSlider(value) {
  autoplaySpeed = value;
  parentSettings.autoplaySpeed = value;
  saveParentSettings();
  if (isAutoplaying) {
    startAutoplay();
  }
}

function handleParentReset() {
  quizState.score = 0;
  quizState.question = null;
  renderQuiz({ hasEnoughItems: canPlayQuiz(currentItems) });
}

function toggleQuizView(showQuiz) {
  const learningView = document.getElementById("learning-view");
  if (!learningView) return;
  learningView.hidden = showQuiz;
}

async function init() {
  if (statusBadge) statusBadge.textContent = "Đang tải dữ liệu...";
  topicsData = await fetchTopics();
  renderModeSwitch(currentMode);
  renderPlayerControls({ isPlaying: isAutoplaying });
  renderTopics(topicsData, currentTopicId);
  showSelectedTopic(null);
  renderItems([], null, currentMode);
  renderPlayer(null, currentMode);
  renderQuiz({ hasEnoughItems: false });
  setQuizVisibility(false);
  if (statusBadge) statusBadge.textContent = "Học vui mỗi ngày";
}

window.addEventListener("beforeunload", () => {
  stopCurrentAudio();
});

init();
