const TOPIC_MANIFEST_PATH = "data/topics.json";

const dataCache = new Map();

export async function fetchTopics() {
  try {
    const response = await fetch(TOPIC_MANIFEST_PATH);
    if (!response.ok) {
      throw new Error(`Không tải được manifest: ${response.status}`);
    }
    const manifest = await response.json();
    return manifest?.topics ?? [];
  } catch (err) {
    console.error("Lỗi tải manifest", err);
    return [];
  }
}

export async function fetchTopicItems(dataFile) {
  if (!dataFile) return [];
  if (dataCache.has(dataFile)) {
    return dataCache.get(dataFile);
  }

  try {
    const response = await fetch(`data/${dataFile}`);
    if (!response.ok) {
      throw new Error(`Không tải được dữ liệu topic ${dataFile}`);
    }
    const data = await response.json();
    const items = data?.items ?? [];
    dataCache.set(dataFile, items);
    return items;
  } catch (err) {
    console.error("Lỗi tải topic", dataFile, err);
    return [];
  }
}
