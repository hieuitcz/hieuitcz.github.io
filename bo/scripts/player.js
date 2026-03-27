let currentAudio = null;

export function playItemSound(item, mode = "sound", options = {}) {
  if (!item) return;
  const { playOnlySound = false } = options;

  stopCurrentAudio();
  if (!playOnlySound) {
    window.speechSynthesis?.cancel();
  }

  if (playOnlySound) {
    if (item.sound) {
      currentAudio = new Audio(item.sound);
      currentAudio.preload = "auto";
      currentAudio.play().catch(() => {});
    }
    return;
  }

  if (mode === "sound" && item.sound) {
    currentAudio = new Audio(item.sound);
    currentAudio.preload = "auto";
    currentAudio.play().catch(() => speakName(item, "vi-VN"));
    return;
  }

  if (mode === "vi") {
    speakName(item, "vi-VN", item.name_vi);
    return;
  }
  if (mode === "en") {
    speakName(item, "en-US", item.name_en || item.name_vi);
    return;
  }
  if (mode === "cz") {
    speakName(item, "cs-CZ", item.name_cz || item.name_vi);
    return;
  }

  speakName(item, "vi-VN", item.name_vi);
}

function getModeLang(mode) {
  if (mode === "en") return "en-US";
  if (mode === "cz") return "cs-CZ";
  return "vi-VN";
}

function getNameByMode(item, mode) {
  if (mode === "en") return item.name_en || item.label_en || item.name_vi;
  if (mode === "cz") return item.name_cz || item.label_cz || item.name_vi;
  if (mode === "vi") return item.name_vi;
  return item.name_vi;
}

function speakName(item, lang = "vi-VN", text = item.name_vi, onend) {
  if (!text || !("speechSynthesis" in window)) {
    if (typeof onend === "function") {
      onend();
    }
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (typeof onend === "function") {
    utterance.onend = onend;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}
