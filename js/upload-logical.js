// js/upload-logic.js - Handles Teacher's Material Upload Functionality

const uploadForm = document.getElementById('upload-form');
const subjectSelect = document.getElementById('subjectId');
const messageElement = document.getElementById('message-area');

// NOTE: BASE_URL must be defined globally, usually by main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Fetch subjects when the page loads
    fetchSubjects();
    
    // 2. Attach submit handler to the upload form
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }
});

// Utility function to display messages on the upload page
function showLocalMessage(text, isError = false) {
    if (messageElement) {
        messageElement.textContent = text;
        // Use the CSS classes defined in your style.css
        messageElement.className = isError ? 'message message-error' : 'message message-success';
        setTimeout(() => {
            messageElement.textContent = '';
            messageElement.className = '';
        }, 5000);
    }
}

// Fetches the subject list from the server to populate the dropdown
async function fetchSubjects() {
    try {
        const response = await fetch(`${BASE_URL}/api/subjects`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Clear default option
            subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>';
            
            data.subjects.forEach(subject => {
                const option = document.createElement('option');
                // The 'value' is the MongoDB ID of the subject (used for saving)
                option.value = subject._id; 
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            });
        } else {
            showLocalMessage('Failed to load subjects. Check server connection.', true);
        }
    } catch (error) {
        console.error('Network error fetching subjects:', error);
        showLocalMessage('Network error: Cannot connect to fetch subjects.', true);
    }
}

// Handles the file upload submission
async function handleUpload(event) {
    event.preventDefault();
    showLocalMessage('Uploading material...', false);

    // CRITICAL: FormData packages the text fields AND the file for the server (Multer)
    const formData = new FormData(uploadForm);
    
    try {
        const response = await fetch(`${BASE_URL}/api/materials/upload`, {
            method: 'POST',
            // DO NOT set Content-Type header; FormData handles it automatically
            body: formData
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            showLocalMessage(data.message, false);
            uploadForm.reset(); // Clear the form
            // Redirect teacher back to dashboard after a successful upload
            setTimeout(() => window.location.href = 'dashboard.html', 2000); 
        } else {
            showLocalMessage(data.message || 'Upload failed. Check if you are logged in as a teacher.', true);
        }
        
    } catch (error) {
        console.error('Upload network error:', error);
        showMessage('Network error: Could not connect to the server for upload.', true); // Use global showMessage if local fails
    }
}