export function canPlayQuiz(items) {
  return Array.isArray(items) && items.length >= 3;
}

export function generateQuestion(items) {
  if (!canPlayQuiz(items)) return null;
  const shuffled = shuffle([...items]);
  const correct = shuffled[0];
  const optionsPool = shuffled.slice(1);
  const wrongAnswers = shuffle(optionsPool).slice(0, 3);
  const answers = shuffle([correct, ...wrongAnswers]).map((item) => ({
    id: item.id,
    name_vi: item.name_vi,
    name_en: item.name_en,
    name_cz: item.name_cz,
    emoji: item.emoji,
    image: item.image,
    color: item.color,
  }));

  return {
    question: correct.name_vi,
    correctId: correct.id,
    correct,
    answers,
  };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function checkAnswer(question, answerId) {
  if (!question) return { correct: false };
  return {
    correct: question.correctId === answerId,
  };
}
