

// js/teacher-logic.js - FINAL COMPLETE FUNCTIONAL CODE

const materialsListArea = document.getElementById('material-list-area');
const subjectSelect = document.getElementById('subjectId'); 
const BASE_URL = 'http://localhost:3001'; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup logic for the Teacher's page (runs immediately)
    populateSubjects(); 
    attachUploadFormListener(); 
    
    // 2. Fetch materials for the list and student progress data
    fetchAndRenderMaterials('teacher'); 
    fetchStudentProgress(); // Fetch results immediately on load
});

// --- TEACHER-SPECIFIC UPLOAD SETUP ---

function attachUploadFormListener() {
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleDashboardUpload);
    }
}

async function handleDashboardUpload(event) {
    event.preventDefault();
    const uploadForm = event.target;
    const uploadMsgEl = document.getElementById('dashUploadMsg');
    
    if (uploadMsgEl) uploadMsgEl.textContent = 'Uploading material...';
    const formData = new FormData(uploadForm);
    
    try {
        const response = await fetch(${BASE_URL}/api/materials/upload, {
            method: 'POST',
            body: formData 
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
            if (uploadMsgEl) uploadMsgEl.className = 'message message-success';
            if (uploadMsgEl) uploadMsgEl.textContent = data.message;
            uploadForm.reset(); 
            fetchAndRenderMaterials('teacher'); // Refresh the material list
        } else {
            if (uploadMsgEl) uploadMsgEl.className = 'message message-error';
            if (uploadMsgEl) uploadMsgEl.textContent = data.message || 'Upload failed.';
        }
    } catch (error) {
        console.error('Upload network error:', error);
        if (uploadMsgEl) uploadMsgEl.textContent = 'Network error during upload.';
    }
}

// Fills the subject dropdown with data from the server
async function populateSubjects() {
    // CRITICAL: Get the element by ID right before using it
    const subjectSelect = document.getElementById('subjectId'); 

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

// --- STUDENT PROGRESS TRACKING (The Scoreboard) ---
async function fetchStudentProgress() {
    const progressContainer = document.getElementById('progress-bar-container');
    if (!progressContainer) return;

    progressContainer.innerHTML = '<p class="message-info">Fetching latest student results...</p>';

    try {
        const response = await fetch(${BASE_URL}/api/results/students); 
        const data = await response.json();

        if (response.ok && data.success) {
            progressContainer.innerHTML = '';
            
            if (data.progress.length === 0) {
                 progressContainer.innerHTML = '<p class="message-info">No quizzes have been submitted yet. Progress tracking will appear here after first submission.</p>';
                 return;
            }

            // Render detailed progress for each student
            data.progress.forEach(student => {
                const quizList = student.completedQuizzes.map(quiz => 
                    `<li style="font-size: 0.9em;">
                        <strong>${quiz.quizTitle}</strong>: ${quiz.score}/${quiz.total}
                    </li>`
                ).join('');
                
                progressContainer.innerHTML += `
                    <div class="card" style="margin-bottom: 15px; border-left: 5px solid var(--color-primary);">
                        <h4>Name: ${student.fullName}</h4>
                        <p>Total Quizzes Completed: <strong>${student.totalQuizzes}</strong></p>
                        <p style="font-weight: bold; margin-top: 5px;">Quizzes Taken:</p>
                        <ul style="list-style-type: disc; margin-left: 20px;">
                            ${quizList}
                        </ul>
                    </div>
                `;
            });
            
        } else {
            progressContainer.innerHTML = <p class="message-error">Error: ${data.message || 'Failed to load progress data.'}</p>;
        }
    } catch (error) {
        progressContainer.innerHTML = '<p class="message-error">Network error connecting to the results server.</p>';
        console.error('Progress fetch failed:', error);
    }
}


// --- GENERAL MATERIAL FETCH FUNCTION (Needed to display list) ---
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
        
        materialsListArea.innerHTML = ''; 
        
        for (const subject of subjectData.subjects) {
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