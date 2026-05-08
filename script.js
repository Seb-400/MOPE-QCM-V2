/**
 * MOTEUR DE QUIZ - MOPE EXHAUSTIF
 * Gère le balayage de toutes les matières sans répétition des acquis.
 */

let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let mistakes = [];
let startTime = null;
let currentShuffledOptions = [];

const STORAGE_KEY = "mope_quiz_progress";

// --- PERSISTANCE DES DONNÉES ---
const getAnsweredIds = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const saveSuccess = (id) => {
    const answered = getAnsweredIds();
    if (!answered.includes(id)) {
        answered.push(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answered));
    }
};

const resetProgress = () => {
    if (confirm("Seb, veux-tu vraiment effacer ton historique de réussite et recommencer à zéro ?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
};

// --- ÉLÉMENTS UI ---
const dom = {
    selection: document.getElementById("subject-selection"),
    select: document.getElementById("subject-select"),
    startBtn: document.getElementById("start-btn"),
    quiz: document.getElementById("quiz-container"),
    question: document.getElementById("question"),
    form: document.getElementById("answers-form"),
    submit: document.getElementById("submit-btn"),
    feedback: document.getElementById("feedback"),
    result: document.getElementById("result"),
    score: document.getElementById("score"),
    recap: document.getElementById("recap"),
    time: document.getElementById("time"),
    restart: document.getElementById("restart-btn"),
    img: document.getElementById("question-image")
};

// --- CHARGEMENT DU JSON ---
// Utilise le nom exact de ton fichier ici
fetch('./questions_with_subject_v2.json')
    .then(res => res.json())
    .then(data => {
        // Création d'un ID unique basé sur le texte de la question pour le suivi
        allQuestions = data.map(q => ({
            ...q,
            id: btoa(unescape(encodeURIComponent(q.question))).substring(0, 32)
        }));
        populateSubjects();
    })
    .catch(err => alert("Erreur de chargement du JSON : " + err));

function populateSubjects() {
    const subjects = [...new Set(allQuestions.map(q => q.subject))];
    const answeredIds = getAnsweredIds();
    
    dom.select.innerHTML = '<option value="">-- Choisissez une matière --</option>';
    subjects.forEach(sub => {
        const total = allQuestions.filter(q => q.subject === sub).length;
        const done = allQuestions.filter(q => q.subject === sub && answeredIds.includes(q.id)).length;
        
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = `${sub} (${done}/${total} maîtrisés)`;
        dom.select.appendChild(opt);
    });
}

// --- LOGIQUE DU JEU ---
dom.startBtn.addEventListener("click", () => {
    const sub = dom.select.value;
    if (!sub) return;

    const answeredIds = getAnsweredIds();
    // On ne prend QUE les questions qui ne sont pas dans le localStorage
    let available = allQuestions.filter(q => q.subject === sub && !answeredIds.includes(q.id));

    if (available.length === 0) {
        alert("Félicitations ! Tu as balayé toutes les questions de cette matière.");
        return;
    }

    // Mélange et sélection des 20 prochaines questions
    questions = available.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    currentQuestionIndex = 0;
    score = 0;
    mistakes = [];
    startTime = new Date();
    
    dom.selection.classList.add("hidden");
    dom.quiz.classList.remove("hidden");
    loadQuestion();
});

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    dom.question.textContent = q.question;
    dom.form.innerHTML = "";
    dom.feedback.textContent = "";

    if (q.image) {
        dom.img.src = q.image;
        dom.img.classList.remove("hidden");
    } else {
        dom.img.classList.add("hidden");
    }

    currentShuffledOptions = q.options.map((opt, idx) => ({ opt, idx }));
    currentShuffledOptions.sort(() => 0.5 - Math.random());

    currentShuffledOptions.forEach(({ opt }, i) => {
        const label = document.createElement("label");
        label.className = "answer-option";
        label.innerHTML = `
            <input type="checkbox" name="answer" value="${i}">
            <span>${opt}</span>
        `;
        dom.form.appendChild(label);
    });
}

dom.submit.addEventListener("click", () => {
    const checked = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
                         .map(i => parseInt(i.value));
    
    if (checked.length === 0) return;

    const userIndices = checked.map(i => currentShuffledOptions[i].idx);
    const q = questions[currentQuestionIndex];
    
    const isCorrect = userIndices.length === q.correctAnswers.length &&
                      userIndices.every(v => q.correctAnswers.includes(v));

    if (isCorrect) {
        score++;
        dom.feedback.innerHTML = "<span style='color:green'>Excellent !</span>";
        saveSuccess(q.id); // Enregistre l'ID pour ne plus la revoir
    } else {
        mistakes.push({
            q: q.question,
            y: userIndices.map(i => q.options[i]).join(", "),
            c: q.correctAnswers.map(i => q.options[i]).join(", ")
        });
        dom.feedback.innerHTML = "<span style='color:red'>Erreur technique ou théorique.</span>";
    }

    currentQuestionIndex++;
    setTimeout(() => {
        if (currentQuestionIndex < questions.length) loadQuestion();
        else showResult();
    }, 1000);
});

function showResult() {
    dom.quiz.classList.add("hidden");
    dom.result.classList.remove("hidden");
    dom.score.textContent = `Score session : ${score} / ${questions.length}`;
    
    const time = Math.round((new Date() - startTime) / 1000);
    dom.time.textContent = `Temps écoulé : ${time} secondes.`;

    dom.recap.innerHTML = mistakes.length > 0 ? "<h3>À revoir :</h3>" : "<h3>Parfait ! Tu maîtrises le sujet.</h3>";
    mistakes.forEach(m => {
        dom.recap.innerHTML += `
            <div class="mistake">
                <p><strong>Q:</strong> ${m.q}</p>
                <p style="color:red">Ta réponse : ${m.y}</p>
                <p style="color:green">Correction : ${m.c}</p>
            </div><hr>
        `;
    });
}

dom.restart.addEventListener("click", () => location.reload());
