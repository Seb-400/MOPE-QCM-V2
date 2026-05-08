/**
 * MOTEUR DE QUIZ - VARIANTE APPRENTISSAGE CONTINU
 * Les erreurs ne sont pas enregistrées : la question revient tant qu'elle n'est pas réussie.
 */

let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let mistakes = [];
let startTime = null;
let currentShuffledOptions = [];

const STORAGE_KEY = "mope_quiz_progress";

// --- GESTION DE LA PROGRESSION ---
const getAnsweredIds = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

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

// --- CHARGEMENT ---
fetch('./questions_with_subject_v2.json')
    .then(res => res.json())
    .then(data => {
        // Génération d'ID unique si absent
        allQuestions = data.map((q, index) => ({
            ...q,
            id: q.id || btoa(unescape(encodeURIComponent(q.question))).substring(0, 24)
        }));
        populateSubjects();
    });

function populateSubjects() {
    const subjects = [...new Set(allQuestions.map(q => q.subject))];
    const answeredIds = getAnsweredIds();
    const select = document.getElementById("subject-select");
    
    select.innerHTML = '<option value="">-- Choisissez une matière --</option>';
    subjects.forEach(sub => {
        const total = allQuestions.filter(q => q.subject === sub).length;
        const done = allQuestions.filter(q => q.subject === sub && answeredIds.includes(q.id)).length;
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = `${sub} (${done}/${total} validés)`;
        select.appendChild(opt);
    });
}

// --- LANCEMENT DU QUIZ ---
document.getElementById("start-btn").addEventListener("click", () => {
    const sub = document.getElementById("subject-select").value;
    if (!sub) return;

    const answeredIds = getAnsweredIds();
    // FILTRE CRUCIAL : On ne prend que ce qui n'est PAS encore réussi
    let available = allQuestions.filter(q => q.subject === sub && !answeredIds.includes(q.id));

    if (available.length === 0) {
        alert("Matière terminée ! Réinitialise pour recommencer.");
        return;
    }

    // Mélange aléatoire des questions disponibles
    questions = available.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    currentQuestionIndex = 0;
    score = 0;
    mistakes = [];
    startTime = new Date();
    
    document.getElementById("subject-selection").classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");
    loadQuestion();
});

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    document.getElementById("question").textContent = q.question;
    const form = document.getElementById("answers-form");
    form.innerHTML = "";
    document.getElementById("feedback").textContent = "";

    // Image si présente
    const img = document.getElementById("question-image");
    if (q.image) { img.src = q.image; img.classList.remove("hidden"); } 
    else { img.classList.add("hidden"); }

    // Mélange des options
    currentShuffledOptions = q.options.map((opt, idx) => ({ opt, idx }));
    currentShuffledOptions.sort(() => 0.5 - Math.random());

    currentShuffledOptions.forEach(({ opt }, i) => {
        const label = document.createElement("label");
        label.className = "answer-option";
        label.innerHTML = `<input type="checkbox" name="answer" value="${i}"> <span>${opt}</span>`;
        form.appendChild(label);
    });
}

// --- VALIDATION ---
document.getElementById("submit-btn").addEventListener("click", () => {
    const checked = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
                         .map(i => parseInt(i.value));
    
    if (checked.length === 0) return;

    const userIndices = checked.map(i => currentShuffledOptions[i].idx);
    const q = questions[currentQuestionIndex];
    const isCorrect = userIndices.length === q.correctAnswers.length &&
                      userIndices.every(v => q.correctAnswers.includes(v));

    const feedback = document.getElementById("feedback");

    if (isCorrect) {
        score++;
        feedback.innerHTML = "<span style='color:green'>Correct !</span>";
        // LA QUESTION EST RÉUSSIE : On l'enregistre pour ne plus la revoir
        saveSuccess(q.id); 
    } else {
        mistakes.push({
            q: q.question,
            y: userIndices.map(i => q.options[i]).join(", "),
            c: q.correctAnswers.map(i => q.options[i]).join(", ")
        });
        feedback.innerHTML = "<span style='color:red'>Faux. Elle reviendra plus tard !</span>";
        // ON NE SAUVEGARDE PAS : Elle restera dans "available" au prochain lancement
    }

    currentQuestionIndex++;
    setTimeout(() => {
        if (currentQuestionIndex < questions.length) loadQuestion();
        else showResult();
    }, 1000);
});

function showResult() {
    document.getElementById("quiz-container").classList.add("hidden");
    document.getElementById("result").classList.remove("hidden");
    document.getElementById("score").textContent = `Session : ${score} / ${questions.length}`;
    document.getElementById("recap").innerHTML = mistakes.length > 0 ? "<h3>Corrections :</h3>" : "<h3>Zéro faute !</h3>";
    mistakes.forEach(m => {
        document.getElementById("recap").innerHTML += `<div class='mistake'><p><strong>Q:</strong> ${m.q}</p><p style='color:red'>Toi : ${m.y}</p><p style='color:green'>Correct : ${m.c}</p></div><hr>`;
    });
}

document.getElementById("restart-btn").addEventListener("click", () => location.reload());
