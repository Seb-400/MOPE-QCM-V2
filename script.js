/**
 * MOTEUR DE QUIZ - VERSION CORRIGÉE
 * Correction bug de progression inter-matières
 */

let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let mistakes = [];
let startTime = null;
let currentShuffledOptions = [];

// nouvelle clé pour éviter de réutiliser l'ancien cache corrompu
const STORAGE_KEY = "mope_quiz_progress_v6";

// ==================== STOCKAGE ====================

const getAnsweredIds = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
};

const saveSuccess = (id) => {
    const answered = getAnsweredIds();
    if (!answered.includes(id)) {
        answered.push(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answered));
    }
};

const resetProgress = () => {
    if (confirm("Réinitialiser tout l'historique ?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
};

// ==================== CHARGEMENT JSON ====================

fetch('./questions_with_subject_v2.json')
    .then(response => {
        if (!response.ok) {
            throw new Error("Impossible de charger questions_with_subject_v2.json");
        }
        return response.json();
    })
    .then(data => {
        allQuestions = data
            // on élimine les lignes invalides du JSON
            .filter(q =>
                q &&
                typeof q.subject === "string" &&
                q.subject.trim() !== "" &&
                typeof q.question === "string" &&
                q.question.trim() !== "" &&
                Array.isArray(q.options) &&
                q.options.length > 0 &&
                Array.isArray(q.correctAnswers) &&
                q.correctAnswers.length > 0
            )
            .map((q, index) => {
                // ID forcé, stable, unique, sans utiliser q.id
                const uniqueId = btoa(
                    unescape(
                        encodeURIComponent(
                            `${q.subject.trim()}::${index}::${q.question.trim()}::${q.options.join("|")}::${q.correctAnswers.join(",")}`
                        )
                    )
                );

                return {
                    ...q,
                    subject: q.subject.trim(),
                    question: q.question.trim(),
                    id: uniqueId
                };
            });

        populateSubjects();
        console.log("Questions chargées :", allQuestions.length);
    })
    .catch(err => {
        console.error(err);
        alert(err.message);
    });

// ==================== MATIÈRES ====================

function populateSubjects() {
    const answeredIds = getAnsweredIds();
    const select = document.getElementById("subject-select");

    const validQuestions = allQuestions.filter(
        q => q.subject && q.subject.trim() !== ""
    );

    const subjects = [...new Set(validQuestions.map(q => q.subject))];

    select.innerHTML = '<option value="">-- Choisissez une matière --</option>';

    subjects.forEach(subject => {
        const questionsInSub = validQuestions.filter(
            q => q.subject === subject
        );

        const doneCount = questionsInSub.filter(
            q => answeredIds.includes(q.id)
        ).length;

        const totalCount = questionsInSub.length;

        const option = document.createElement("option");
        option.value = subject;
        option.textContent = `${subject} (${doneCount}/${totalCount} maîtrisés)`;

        select.appendChild(option);
    });
}

// ==================== DÉMARRAGE QUIZ ====================

document.getElementById("start-btn").addEventListener("click", () => {
    const selectedSubject = document.getElementById("subject-select").value;

    if (!selectedSubject) {
        alert("Choisis une matière");
        return;
    }

    const answeredIds = getAnsweredIds();

    let available = allQuestions.filter(q =>
        q.subject === selectedSubject &&
        !answeredIds.includes(q.id)
    );

    if (available.length === 0) {
        alert("Toutes les questions de cette matière sont maîtrisées.");
        return;
    }

    questions = available
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

    currentQuestionIndex = 0;
    score = 0;
    mistakes = [];
    startTime = new Date();

    document.getElementById("subject-selection").classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");

    loadQuestion();
});

// ==================== CHARGER QUESTION ====================

function loadQuestion() {
    document.getElementById("submit-btn").disabled = false;

    const q = questions[currentQuestionIndex];

    document.getElementById("question").textContent = q.question;

    const form = document.getElementById("answers-form");
    form.innerHTML = "";

    document.getElementById("feedback").textContent = "";

    const img = document.getElementById("question-image");

    if (q.image) {
        img.src = q.image;
        img.classList.remove("hidden");
    } else {
        img.classList.add("hidden");
    }

    currentShuffledOptions = q.options.map((opt, idx) => ({
        opt,
        idx
    }));

    currentShuffledOptions.sort(() => Math.random() - 0.5);

    currentShuffledOptions.forEach(({ opt }, i) => {
        const label = document.createElement("label");
        label.className = "answer-option";

        label.innerHTML = `
            <input type="checkbox" name="answer" value="${i}">
            <span>${opt}</span>
        `;

        form.appendChild(label);
    });
}

// ==================== VALIDATION ====================

document.getElementById("submit-btn").addEventListener("click", () => {
    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn.disabled) return;

    const checked = Array.from(
        document.querySelectorAll('input[name="answer"]:checked')
    ).map(input => parseInt(input.value));

    if (checked.length === 0) {
        return;
    }

    submitBtn.disabled = true;

    const q = questions[currentQuestionIndex];

    const userIndices = checked.map(
        i => currentShuffledOptions[i].idx
    );

    const isCorrect =
        userIndices.length === q.correctAnswers.length &&
        userIndices.every(i => q.correctAnswers.includes(i));

    const feedback = document.getElementById("feedback");

    if (isCorrect) {
        score++;
        saveSuccess(q.id);

        feedback.innerHTML =
            "<span style='color:green'>Correct !</span>";
    } else {
        mistakes.push({
            q: q.question,
            y: userIndices.map(i => q.options[i]).join(", "),
            c: q.correctAnswers.map(i => q.options[i]).join(", ")
        });

        feedback.innerHTML =
            "<span style='color:red'>Faux. Elle reviendra plus tard.</span>";
    }

    currentQuestionIndex++;

    setTimeout(() => {
        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            showResult();
        }
    }, 900);
});

// ==================== RÉSULTATS ====================

function showResult() {
    document.getElementById("quiz-container").classList.add("hidden");
    document.getElementById("result").classList.remove("hidden");

    document.getElementById("score").textContent =
        `Session : ${score} / ${questions.length}`;

    const recap = document.getElementById("recap");

    if (mistakes.length === 0) {
        recap.innerHTML = "<h3>Zéro faute !</h3>";
        return;
    }

    recap.innerHTML = "<h3>Corrections :</h3>";

    mistakes.forEach(m => {
        recap.innerHTML += `
            <div class='mistake'>
                <p><strong>Q:</strong> ${m.q}</p>
                <p style='color:red'>Toi : ${m.y}</p>
                <p style='color:green'>Correct : ${m.c}</p>
            </div>
            <hr>
        `;
    });
}

// ==================== RESTART ====================

document.getElementById("restart-btn").addEventListener("click", () => {
    location.reload();
});
