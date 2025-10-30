// js/dashboard-logic.js - Final Stable Code for Teacher Dashboard

const materialsListArea = document.getElementById('material-list-area');
const subjectSelect = document.getElementById('subjectId'); 
 // Uses localhost to match main.js

// js/dashboard-logic.js - Inside the initialization section

// --- 1. GLOBAL INITIALIZATION (Called by main.js) ---
window.initDashboardLogic = function(userRole, userFullName) {
    // CRITICAL FIX: This line makes the buttons clickable
    setupTabSwitching(); 

    if (userRole === 'teacher') {
        // Teacher logic (uploads/subjects)
        populateSubjects();
        attachUploadFormListener();
    } 
    
    // Always fetch materials for display
    fetchAndRenderMaterials(userRole);
};
// ... rest of the file contents ...

// --- ADD THIS FUNCTION HERE (It should be near the top or bottom of the file) ---
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetTab = button.dataset.tab; 

            // 1. Deactivate all buttons and hide all content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.style.display = 'none');

            // 2. Activate the clicked button and show the target pane
            button.classList.add('active');
            
            const targetPane = document.getElementById(targetTab + '-tab');
            if (targetPane) {
                targetPane.style.display = 'block';
            }
            
            // 3. Run specific logic for the Quizzes tab
            if (targetTab === 'quizzes') {
                // This is where you would call the function to display available quizzes
                fetchAndRenderQuizzesForStudent(); 
            }
        });
    });
}
// ... rest of the file ...
// js/dashboard-logic.js - Final function to load student quiz list

async function fetchAndRenderQuizzesForStudent() {
    const listContainer = document.getElementById('quiz-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="message-info">Fetching available quizzes...</p>';

    try {
        // Fetch subjects to organize the quiz list
        const subjectResponse = await fetch(${BASE_URL}/api/subjects);
        const subjectData = await subjectResponse.json();
        
        if (!subjectData.success) {
            listContainer.innerHTML = '<p class="message-error">Could not load subjects for categorization.</p>';
            return;
        }

        listContainer.innerHTML = ''; // Clear loading message

        for (const subject of subjectData.subjects) {
            // Fetch quizzes specific to this subject ID
            // NOTE: This relies on the server having the GET /api/quizzes/subject/:id route!
            const quizResponse = await fetch(${BASE_URL}/api/quizzes/subject/${subject._id}); 
            const quizData = await quizResponse.json();

            if (quizData.success && quizData.quizzes.length > 0) {
                listContainer.innerHTML += `
                    <h4 style="color: var(--color-primary); margin-top: 10px;">${subject.name} Quizzes:</h4>
                `;

                quizData.quizzes.forEach(quiz => {
                    // CRITICAL: Create a link that passes the quiz ID to the quiz-take page
                    listContainer.innerHTML += `
                        <div class="card" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; padding: 10px;">
                            


<a href="quiz-take.html?quizId=${quiz._id}" class="btn btn-success btn-small">Start Quiz</a>
                        </div>
                    `;
                });
            }
        }
        
        if (listContainer.innerHTML === '') {
            listContainer.innerHTML = '<p class="message-info">No quizzes available at this time.</p>';
        }

    } catch (error) {
        console.error("Error fetching quizzes:", error);
        listContainer.innerHTML = '<p class="message-error">Network error loading quizzes.</p>';
    }
}

// --- 2. TEACHER-SPECIFIC UPLOAD SETUP ---

// Attach listener to the upload form (runs when the page loads)
function attachUploadFormListener() {
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        // Attach the submission handler
        uploadForm.addEventListener('submit', handleDashboardUpload);
    }
}

// Handles the file upload submission from the form on THIS page
async function handleDashboardUpload(event) {
    event.preventDefault();
    const uploadForm = event.target;
    const uploadMsgEl = document.getElementById('dashUploadMsg');
    
    if (uploadMsgEl) uploadMsgEl.textContent = 'Uploading material...';

    // CRITICAL: Ensure form data is correct
    const formData = new FormData(uploadForm);
    
    try {
        const response = await fetch(${BASE_URL}/api/materials/upload, {
            method: 'POST',
            body: formData // Sends the file data
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            if (uploadMsgEl) uploadMsgEl.className = 'message message-success';
            if (uploadMsgEl) uploadMsgEl.textContent = data.message;
            uploadForm.reset(); 
            
            // Re-render the materials list after successful upload
            fetchAndRenderMaterials('teacher'); 
            
        } else {
            if (uploadMsgEl) uploadMsgEl.className = 'message message-error';
            if (uploadMsgEl) uploadMsgEl.textContent = data.message || 'Upload failed. Please check server logs.';
        }
        
    } catch (error) {
        console.error('Upload network error:', error);
        if (uploadMsgEl) uploadMsgEl.textContent = 'Network error during upload.';
    }
}


// Fills the subject dropdown with data from the server
async function populateSubjects() {
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
        }
    } catch (error) {
        console.error('Network error fetching subjects:', error);
    }
}


// --- 3. GENERAL MATERIAL FETCH FUNCTION (For both roles) ---
async function fetchAndRenderMaterials(role) {
    if (!materialsListArea) return;
    
    materialsListArea.innerHTML = '<li class="message message-info">Fetching materials...</li>'; 

    try {
        const subjectResponse = await fetch(${BASE_URL}/api/subjects);
        const subjectData = await subjectResponse.json();
        
        if (!subjectData.success || subjectData.subjects.length === 0) {
            materialsListArea.innerHTML = '<li class="message message-info">No courses available to load materials.</li>';
            return;
        }
        
        materialsListArea.innerHTML = ''; // Clear 'Fetching...' message
        
        for (const subject of subjectData.subjects) {
            // Fetch materials for each subject
            const materialsResponse = await fetch(${BASE_URL}/api/materials/subject/${subject._id});
            const materialsData = await materialsResponse.json();
            
            if (materialsData.success && materialsData.materials.length > 0) {
                materialsListArea.innerHTML += <li class="material-subject-header" style="font-weight: bold; margin-top: 15px;">${subject.name}</li>;

                materialsData.materials.forEach(material => {
                    materialsListArea.innerHTML += `
                        <li class="material-list-item">
                            <div class="material-details">
                                <span>${material.title}</span>
                                <span class="material-meta">Uploaded by: ${material.uploadedBy.fullName}</span>
                            </div>
                            <a href="${BASE_URL}${material.file}" target="_blank" class="btn btn-primary btn-small">Download</a>
                        </li>
                    `;
                });
            }
        }
        
        if (materialsListArea.innerHTML === '') {
             materialsListArea.innerHTML = '<li class="message message-info">No study materials uploaded yet.</li>';
        }

    } catch (error) {
        console.error('Error fetching/rendering materials:', error);
        materialsListArea.innerHTML = '<li class="message message-error">Error connecting to load material data.</li>';
    }
}

