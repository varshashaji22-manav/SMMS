// server.js - FINAL COMPLETE VERSION WITH ALL FIXES AND MISSING ROUTE

require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors'); 
const multer = require('multer'); 
const path = require('path'); 
const fs = require('fs'); 

const app = express();
const port = process.env.PORT || 3001; 

// 1. Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. CORS Middleware (FIXED for stability)
app.use(cors({ 
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'null'], 
    credentials: true 
}));

// 3. Session Middleware (FIXED for stability)
app.use(session({
    secret: process.env.SESSION_SECRET || 'aVerySecretKeyForSessions', 
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        domain: 'localhost' 
    }
}));

// --- Middleware Functions ---
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
};

const isTeacherAuthenticated = (req, res, next) => {
    if (req.session.userId && req.session.userRole === 'teacher') {
        return next();
    }
    res.status(403).json({ success: false, message: 'Forbidden: Requires teacher role.' });
};

// --- Mongoose Schemas and Models ---
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { 
        type: String, required: true, unique: true, trim: true, lowercase: true
    },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher'], default: 'student'}
});
const User = mongoose.model('User', userSchema);

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});
const Subject = mongoose.model('Subject', subjectSchema);

const courseMaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    file: { type: String }, 
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadDate: { type: Date, default: Date.now }
});
const CourseMaterial = mongoose.model('CourseMaterial', courseMaterialSchema);

// server.js - PASTE THIS CODE INTO THE SCHEMAS SECTION

// Quiz Schema (CRITICAL: Required for the /api/quizzes route to work)
const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [
        {
            questionText: { type: String, required: true },
            options: [{ type: String, required: true }],
            correctAnswer: { type: String, required: true } 
        }
    ],
    createdAt: { type: Date, default: Date.now }
});
const Quiz = mongoose.model('Quiz', quizSchema);

// Result Schema (Required for tracking student progress)
const resultSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', resultSchema);

// --- Subject Seeder Function ---
const seedSubjects = async () => {
    try {
        const subjects = [
            { name: 'Mathematics' },
            { name: 'Science' },
            { name: 'Web Development' },
            { name: 'Artificial Intelligence' },
        ];

        for (const subjectData of subjects) {
            await Subject.findOneAndUpdate(
                { name: subjectData.name },
                { $setOnInsert: subjectData },
                { upsert: true, new: true, runValidators: true }
            );
        }
        console.log('✅ Subject database check complete. Ready for use.');
    } catch (error) {
        console.error('❌ Error seeding subjects:', error);
    }
};


// --- MongoDB Connection ---
console.log("Attempting MongoDB connection...");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('✅ MongoDB Connected successfully!');
    seedSubjects(); 
})
.catch(err => {
    console.error('❌ MongoDB connection FAILED:', err.message);
    console.error('Please check your .env MONGO_URI string for errors.');
});


// --- File Uploads (for course materials) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); 
    }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- API ROUTES ---

// 1. User Authentication Routes
// Register (FIXED)
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body; 
        
        if (!fullName || !email || !password || !role) { 
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already taken.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ fullName, email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ success: true, message: 'Registration successful! Please login.' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration. Check server console.' });
    }
});
// server.js - ADD THIS MISSING ROUTE

// ROUTE: Get Quizzes by Subject ID (Needed for Student Dashboard list)
app.get('/api/quizzes/subject/:subjectId', isAuthenticated, async (req, res) => {
    try {
        // Find all quizzes belonging to the subject and populate the teacher's name
        const quizzes = await Quiz.find({ subject: req.params.subjectId })
                                .populate('teacher', 'fullName');
        
        if (quizzes.length === 0) {
            return res.status(200).json({ success: true, quizzes: [] });
        }

        res.status(200).json({ success: true, quizzes });
    } catch (error) {
        console.error('Error fetching quizzes by subject:', error);
        res.status(500).json({ success: false, message: 'Server failed to retrieve quizzes.' });
    }
});


// ROUTE: Get a single quiz by ID (Student for taking)
app.get('/api/quizzes/:quizId', isAuthenticated, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        // IMPORTANT: If student, remove correct answers before sending
        if (req.session.userRole === 'student') {
            const quizForStudent = quiz.toObject(); // Convert Mongoose doc to plain object
            // Remove the answer key from each question object
            quizForStudent.questions.forEach(q => delete q.correctAnswer);
            return res.status(200).json({ success: true, quiz: quizForStudent });
        }

        // If teacher or admin, send full details (not currently applicable but good practice)
        res.status(200).json({ success: true, quiz }); 
    } catch (error) {
        console.error('Error fetching single quiz:', error);
        res.status(500).json({ success: false, message: 'Server error loading quiz details.' });
    }
});

// Login (FIXED)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body; 
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        req.session.userId = user._id;
        req.session.userRole = user.role;
        req.session.userFullName = user.fullName;

        res.status(200).json({ success: true, message: 'Login successful!', role: user.role, fullName: user.fullName });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// server.js - ADD THIS MISSING ROUTE

// ROUTE 3: Create a new quiz (Teacher only)
app.post('/api/quizzes', isTeacherAuthenticated, async (req, res) => {
    try {
        const { title, subjectId, questions } = req.body;
        
        // Basic validation check
        if (!title || !subjectId || !questions || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'Quiz title, subject, and at least one question are required.' });
        }

        const newQuiz = new Quiz({
            title,
            subject: subjectId,
            teacher: req.session.userId,
            questions // Array of question objects
        });
        await newQuiz.save();
        
        res.status(201).json({ success: true, message: 'Quiz created successfully!', quizId: newQuiz._id });
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ success: false, message: 'Server error creating quiz.' });
    }
});

// Check Session Status
app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        res.status(200).json({ 
            success: true, 
            isLoggedIn: true, 
            userId: req.session.userId, 
            userRole: req.session.userRole,
            userFullName: req.session.userFullName
        });
    } else {
        res.status(200).json({ success: true, isLoggedIn: false });
    }
});

// CRITICAL FIX: Logout Route is now fully functional and returns JSON
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Could not log out.' }); 
        }
        res.status(200).json({ success: true, message: 'Logged out successfully.' }); 
    });
});


// Route to get all subjects (for dropdowns)
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.status(200).json({ success: true, subjects });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ success: false, message: 'Server error fetching subjects.' });
    }
});

// NEW/FIXED: Route to fetch materials by subject ID
app.get('/api/materials/subject/:subjectId', isAuthenticated, async (req, res) => {
    try {
        // This is the CRITICAL LINE to link material to the user who uploaded it
        const materials = await CourseMaterial.find({ subject: req.params.subjectId })
                                            .populate('uploadedBy', 'fullName'); 
        
        res.status(200).json({ success: true, materials });
    } catch (error) { 
        console.error('Material fetch error:', error);
        res.status(500).json({ success: false, message: 'Server failed to fetch materials from DB.' });
    }
});


// 2. Course Material Routes (Teacher only)
app.post('/api/materials/upload', isTeacherAuthenticated, upload.single('file'), async (req, res) => {
    try {
        const { title, subjectId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
        if (!title || !subjectId) {
            return res.status(400).json({ success: false, message: 'Title and Subject are required.' });
        }

        const newMaterial = new CourseMaterial({
            title,
            subject: subjectId,
            file: '/uploads/' + req.file.filename, 
            uploadedBy: req.session.userId
        });
        await newMaterial.save();
        res.status(201).json({ success: true, message: 'Material uploaded successfully!' });
    } catch (error) {
        console.error('Error uploading material:', error);
        res.status(500).json({ success: false, message: 'Server error during material upload.' });
    }
});

// Serve static files from the root directory (for HTML, CSS, client-side JS)
app.use(express.static(path.join(__dirname, '..'))); 

// Start the server
app.listen(port, () => {
    console.log(`🚀 SMMS Server listening at http://127.0.0.1:${port}`);
});