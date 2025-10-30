// js/quiz-logic.js - TEACHER QUIZ CREATION LOGIC

const BASE_URL = 'http://localhost:3001';
let questionCount = 0;

// 1. This is called by main.js
window.initQuizCreateLogic = function(token) {
    populateSubjects(); // Load subjects for the dropdown
    
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);
    document.getElementById('quiz-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleQuizCreate(token);
    });

    // Add one question to start
    addQuestion();
};

// 2. Fetches subjects for the dropdown
async function populateSubjects() {
    const subjectSelect = document.getElementById('subjectSelect');
    if (!subjectSelect) return; 
    
    try {
        const response = await fetch(${BASE_URL}/api/subjects);
        const data = await response.json();
        
        if (response.ok && data.success) {
            subjectSelect.innerHTML = '<option value="" disabled selected>-- Select Course --</option>';
            data.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject._id; 
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            });
        } else {
            subjectSelect.innerHTML = '<option value="" disabled>Failed to load subjects</option>';
        }
    } catch (error) {
        console.error('Network error fetching subjects:', error);
        subjectSelect.innerHTML = '<option value="" disabled>Error loading subjects</option>';
    }
}

// 3. Adds a new question block to the form
function addQuestion() {
    questionCount++;
    const questionsContainer = document.getElementById('questions-container');
    
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block card';
    questionBlock.id = question-${questionCount};
    questionBlock.style.cssText = 'margin-top: 15px; padding: 10px;';
    
    questionBlock.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4>Question ${questionCount}</h4>
            <button type="button" class="btn btn-danger btn-small remove-question-btn" data-question-id="${questionCount}">Remove</button>
        </div>
        <div class="form-group">
            <label for="q-text-${questionCount}">Question Text</label>
            <input type="text" id="q-text-${questionCount}" name="q-text-${questionCount}" class="form-control" required>
        </div>
        <div class="form-group">
            <label>Options (Enter 4 choices):</label>
            <input type="text" name="q-opt-${questionCount}" class="form-control option-input" placeholder="Option 1" required>
            <input type="text" name="q-opt-${questionCount}" class="form-control option-input" placeholder="Option 2" required>
            <input type="text" name="q-opt-${questionCount}" class="form-control option-input" placeholder="Option 3" required>
            <input type="text" name="q-opt-${questionCount}" class="form-control option-input" placeholder="Option 4" required>
        </div>
        <div class="form-group">
            <label for="q-correct-${questionCount}">Correct Answer (Must match one option exactly):</label>
            <input type="text" id="q-correct-${questionCount}" name="q-correct-${questionCount}" class="form-control" required>
        </div>
    `;
    
    questionsContainer.appendChild(questionBlock);
    
    // Add event listener to the new "Remove" button
    questionBlock.querySelector('.remove-question-btn').addEventListener('click', () => {
        questionsContainer.removeChild(questionBlock);
        // Re-number questions if needed (or just leave as is, server can handle)
    });
}

// 4. Handles the submission of the new quiz
async function handleQuizCreate(token) {
    const form = document.getElementById('quiz-form');
    const messageArea = document.getElementById('message-area');
    
    const quizData = {
        title: form.quizTitle.value,
        subjectId: form.subjectSelect.value,
        questions: []
    };

    try {
        for (let i = 1; i <= questionCount; i++) {
            const qBlock = document.getElementById(question-${i});
            if (!qBlock) continue; // Block was removed

            const text = qBlock.querySelector([name=q-text-${i}]).value;
            const correct = qBlock.querySelector([name=q-correct-${i}]).value;
            const options = [];
            
            qBlock.querySelectorAll([name=q-opt-${i}]).forEach(opt => {
                options.push(opt.value);
            });

            if (!options.includes(correct)) {
                throw new Error(The correct answer for Question ${i} ("${correct}") does not match any of the provided options.);
            }

            quizData.questions.push({ text, options, correct });
        }

        if (quizData.questions.length === 0) {
            throw new Error("You must add at least one question.");
        }

        // All data collected, send to server
        messageArea.innerHTML = '<div class="message message-info">Creating quiz...</div>';

        const response = await fetch(${BASE_URL}/api/quizzes/create, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': Bearer ${token}
            },
            body: JSON.stringify(quizData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            messageArea.innerHTML = '<div class="message message-success">Quiz Created Successfully! You can now assign it to students. Redirecting...</div>';
            form.reset();
            setTimeout(() => {
                window.location.href = 'teacher.html';
            }, 2000);
        } else {
            messageArea.innerHTML = <div class="message message-error">${data.message || 'Failed to create quiz.'}</div>;
        }

    } catch (error) {
        console.error('Quiz creation error:', error);
        messageArea.innerHTML = <div class="message message-error">${error.message}</div>;
    }
}