// Enhanced Backend: Student Companion AI + BrainPlex Brain Teaser
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const PDFParser = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client for Student Companion
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========== MIDDLEWARE SETUP ==========
// Enhanced CORS configuration for all services
const allowedOrigins = [
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https://efgfdsdfdf.github.io/edutrack/ai2.html',
  'https://efgfdsdfdf.github.io',
  'https://edutrack-2-2ufp.onrender.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

// CORS middleware for all routes
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    if (origin.includes('.github.io')) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS allowed for origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'Cache-Control'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ========== HELPER FUNCTIONS ==========
// Student Companion Helper Functions
function encodeImageToBase64(imageBuffer, mimeType) {
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await PDFParser(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

async function extractTextFromDOCX(docxBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

function extractTextFromTXT(txtBuffer) {
  return txtBuffer.toString('utf-8');
}

// AI Puzzle Generation Helper
async function generatePuzzleWithAI(type, difficulty, previousQuestions = []) {
  try {
    const systemPrompt = `You are a puzzle generation AI for BrainPlex Brain Teaser. Generate creative, educational puzzles based on the following requirements:

Type: ${type}
Difficulty: ${difficulty}

Previous questions to avoid: ${previousQuestions.slice(-5).join(', ') || 'None'}

GENERATION RULES:
1. Create ORIGINAL puzzles that haven't been seen before
2. Difficulty levels:
   - Easy: Simple logic, basic patterns, straightforward math
   - Medium: Moderate complexity, requires some thinking
   - Hard: Challenging, requires advanced reasoning
   - Pro: Expert-level, requires creative problem-solving
3. Each puzzle MUST include:
   - A clear, concise question
   - 4 multiple choice options (A, B, C, D)
   - The correct answer (exact text matching one option)
   - Detailed explanation of the solution
   - A helpful hint for users who get stuck
4. Make puzzles educational and mind-expanding
5. Ensure diversity in puzzle types within the category`;

    const userPrompt = `Generate a ${difficulty} difficulty ${type} puzzle. Make it engaging and challenging but solvable.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 800,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content);
    
    return {
      question: response.question,
      options: response.options,
      answer: response.answer,
      explanation: response.explanation,
      hint: response.hint,
      type: type,
      difficulty: difficulty,
      generatedByAI: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('AI Puzzle Generation Error:', error);
    throw new Error('Failed to generate puzzle with AI');
  }
}

// ========== BRAIN PLEX PUZZLES DATABASE ==========
const puzzles = {
  logical: {
    easy: [
      {
        question: "If all cats are mammals and all mammals are animals, then:",
        options: ["All cats are animals", "Some cats are not animals", "All animals are cats", "Some mammals are not cats"],
        answer: "All cats are animals",
        explanation: "This is a syllogism: If A is B, and B is C, then A must be C.",
        type: "Logical Reasoning",
        hint: "Think about the relationship between the categories."
      },
      {
        question: "John is taller than Sarah. Sarah is taller than Mike. Who is the tallest?",
        options: ["John", "Sarah", "Mike", "Cannot determine"],
        answer: "John",
        explanation: "If John > Sarah and Sarah > Mike, then John > Sarah > Mike.",
        type: "Logical Reasoning",
        hint: "Compare the heights in order."
      }
    ],
    medium: [
      {
        question: "Three doctors said Robert was their brother. Robert said he had no brothers. Who is lying?",
        options: ["Robert", "The doctors", "Both", "Neither"],
        answer: "Neither",
        explanation: "Robert could be the doctors' sister. The puzzle doesn't specify Robert's gender.",
        type: "Logical Reasoning",
        hint: "Consider different perspectives and assumptions."
      }
    ],
    hard: [
      {
        question: "You're in a room with three light switches. Each controls one of three light bulbs in another room. You can only enter the other room once. How do you determine which switch controls which bulb?",
        options: [
          "Turn on two switches, wait, then turn one off before entering",
          "Turn all switches on and observe from outside",
          "Bring a mirror to see from the other room",
          "Cannot be determined with one entry"
        ],
        answer: "Turn on two switches, wait, then turn one off before entering",
        explanation: "Turn on switches 1 and 2. Wait 5 minutes. Turn off switch 2. Enter the room. The lit bulb is switch 1. The warm but off bulb is switch 2. The cold bulb is switch 3.",
        type: "Logical Reasoning",
        hint: "Think about additional properties of light bulbs besides being on/off."
      }
    ]
  },
  
  pattern: {
    easy: [
      {
        question: "What comes next in the sequence: 2, 4, 8, 16, ?",
        options: ["24", "32", "28", "20"],
        answer: "32",
        explanation: "Each number is multiplied by 2 to get the next (2×2=4, 4×2=8, 8×2=16, 16×2=32).",
        type: "Pattern Recognition",
        hint: "Look at the multiplication factor between numbers."
      }
    ],
    medium: [
      {
        question: "Complete the pattern: A, C, E, G, ?",
        options: ["H", "I", "J", "K"],
        answer: "I",
        explanation: "The pattern skips one letter each time (A, B, C, D, E, F, G, H, I).",
        type: "Pattern Recognition",
        hint: "Look at the alphabet sequence."
      }
    ]
  },
  
  math: {
    easy: [
      {
        question: "If 15% of 200 is added to 20% of 300, what is the result?",
        options: ["90", "100", "110", "120"],
        answer: "90",
        explanation: "15% of 200 = 30, 20% of 300 = 60, 30 + 60 = 90",
        type: "Mathematical Thinking",
        hint: "Calculate each percentage separately and then add them."
      }
    ],
    medium: [
      {
        question: "Solve for x: 2x + 5 = 17",
        options: ["5", "6", "7", "8"],
        answer: "6",
        explanation: "2x = 17 - 5 → 2x = 12 → x = 6",
        type: "Mathematical Thinking",
        hint: "Isolate x by subtracting 5 from both sides first."
      }
    ]
  },
  
  verbal: {
    easy: [
      {
        question: "Which word is most different: Apple, Orange, Banana, Carrot?",
        options: ["Apple", "Orange", "Banana", "Carrot"],
        answer: "Carrot",
        explanation: "Carrot is a vegetable while the others are fruits.",
        type: "Verbal Intelligence",
        hint: "Think about food categories."
      }
    ],
    medium: [
      {
        question: "What is the opposite of 'Benevolent'?",
        options: ["Kind", "Generous", "Malevolent", "Friendly"],
        answer: "Malevolent",
        explanation: "Benevolent means well-meaning and kindly, while malevolent means having or showing a wish to do evil to others.",
        type: "Verbal Intelligence",
        hint: "Think about the prefix 'mal-' which often means bad."
      }
    ]
  },
  
  memory: {
    easy: [
      {
        sequence: ["Red", "Blue", "Green", "Yellow"],
        question: "What was the third color in the sequence?",
        options: ["Red", "Blue", "Green", "Yellow"],
        answer: "Green",
        explanation: "The sequence was: Red (1st), Blue (2nd), Green (3rd), Yellow (4th).",
        type: "Memory Challenge",
        hint: "Try to visualize the sequence in your mind."
      }
    ],
    medium: [
      {
        sequence: ["7", "3", "9", "2", "5"],
        question: "What was the second number in the sequence?",
        options: ["7", "3", "9", "2"],
        answer: "3",
        explanation: "The sequence was: 7 (1st), 3 (2nd), 9 (3rd), 2 (4th), 5 (5th).",
        type: "Memory Challenge",
        hint: "Count the positions in the sequence."
      }
    ]
  }
};

// Store for memory sequences (in production, use Redis or database)
const memorySequences = new Map();

// Difficulty modifiers for Brain Plex
const difficultyModifiers = {
  easy: { timeBonus: 1.0, iqBonus: 1.0 },
  medium: { timeBonus: 0.8, iqBonus: 1.5 },
  hard: { timeBonus: 0.6, iqBonus: 2.0 },
  pro: { timeBonus: 0.4, iqBonus: 3.0 }
};

// ========== HEALTH & ROOT ENDPOINTS ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: ['Student Companion AI', 'BrainPlex Brain Teaser'],
    version: '2.0.0',
    openai_configured: !!process.env.OPENAI_API_KEY,
    origins_allowed: allowedOrigins,
    brainplex_puzzles: Object.keys(puzzles).reduce((acc, key) => {
      acc[key] = Object.keys(puzzles[key]).reduce((subAcc, diff) => {
        subAcc[diff] = puzzles[key][diff]?.length || 0;
        return subAcc;
      }, {});
      return acc;
    }, {})
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Merged Backend: Student Companion AI + BrainPlex',
    version: '2.0.0'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Merged Backend: Student Companion AI + BrainPlex Brain Teaser',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      health: {
        'GET /api/health': 'Combined health check',
        'GET /health': 'Simple health check'
      },
      studentCompanion: {
        'POST /api/chat': 'AI chat with multimodal support',
        'POST /api/search': 'Web search (simulated)',
        'POST /api/analyze-image': 'Image analysis',
        'POST /api/analyze-document': 'Document analysis'
      },
      brainPlex: {
        'GET /api/brainplex/puzzles': 'Get available puzzles count',
        'POST /api/brainplex/generate': 'Generate brain teaser puzzle',
        'POST /api/brainplex/hint': 'Get hint for puzzle',
        'POST /api/brainplex/explanation': 'Get detailed explanation',
        'POST /api/brainplex/verify': 'Verify answer',
        'POST /api/brainplex/ai-generate': 'Generate puzzle with AI'
      }
    }
  });
});

// ========== BRAIN PLEX BRAIN TEASER ROUTES ==========
// Get available puzzles count
app.get('/api/brainplex/puzzles', (req, res) => {
  try {
    const counts = {};
    for (const mode in puzzles) {
      counts[mode] = {};
      for (const difficulty in puzzles[mode]) {
        counts[mode][difficulty] = puzzles[mode][difficulty].length;
      }
    }
    
    res.json({
      success: true,
      counts: counts,
      totalModes: Object.keys(puzzles).length,
      aiEnabled: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting puzzle counts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get puzzle counts' 
    });
  }
});

// Generate puzzle
app.post('/api/brainplex/generate', async (req, res) => {
  try {
    const { mode, difficulty = 'medium', previousQuestions = [], useAI = false } = req.body;
    
    console.log(`🧠 Generating ${mode} puzzle (${difficulty}) - AI: ${useAI}`);
    
    if (!mode || !puzzles[mode]) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid puzzle mode. Available modes: logical, pattern, math, verbal, memory' 
      });
    }
    
    // Check if AI generation is requested and available
    if (useAI && process.env.OPENAI_API_KEY) {
      try {
        const aiPuzzle = await generatePuzzleWithAI(mode, difficulty, previousQuestions);
        return res.json({
          success: true,
          puzzle: aiPuzzle,
          source: 'ai',
          timestamp: new Date().toISOString()
        });
      } catch (aiError) {
        console.log('AI generation failed, falling back to database:', aiError.message);
        // Continue to database fallback
      }
    }
    
    // Get puzzles for the selected mode and difficulty
    const modePuzzles = puzzles[mode];
    if (!modePuzzles[difficulty] || modePuzzles[difficulty].length === 0) {
      // Fall back to easy if no puzzles for this difficulty
      if (modePuzzles.easy && modePuzzles.easy.length > 0) {
        console.log(`No ${difficulty} puzzles for ${mode}, falling back to easy`);
      } else {
        return res.status(404).json({ 
          success: false, 
          error: `No puzzles available for ${mode} - ${difficulty}` 
        });
      }
    }
    
    const difficultyPuzzles = modePuzzles[difficulty] || modePuzzles.easy;
    
    // Filter out recent questions to avoid repetition
    const availablePuzzles = difficultyPuzzles.filter(puzzle => 
      !previousQuestions.includes(puzzle.question)
    );
    
    // If all puzzles have been used, reset by using any puzzle
    const selectedPuzzle = availablePuzzles.length > 0 
      ? availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)]
      : difficultyPuzzles[Math.floor(Math.random() * difficultyPuzzles.length)];
    
    // For memory puzzles, store the sequence
    let sequenceId = null;
    if (mode === 'memory' && selectedPuzzle.sequence) {
      sequenceId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      memorySequences.set(sequenceId, {
        sequence: selectedPuzzle.sequence,
        question: selectedPuzzle.question,
        answer: selectedPuzzle.answer,
        timestamp: Date.now()
      });
      
      // Clean up old memory sequences (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [id, data] of memorySequences.entries()) {
        if (data.timestamp < oneHourAgo) {
          memorySequences.delete(id);
        }
      }
    }
    
    // Add difficulty-specific modifications
    const puzzleWithDifficulty = {
      ...selectedPuzzle,
      difficulty,
      timeLimit: 120 * (difficultyModifiers[difficulty]?.timeBonus || 1),
      iqValue: 10 * (difficultyModifiers[difficulty]?.iqBonus || 1),
      sequenceId: sequenceId,
      generatedByAI: false
    };
    
    res.json({
      success: true,
      puzzle: puzzleWithDifficulty,
      source: 'database',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating puzzle:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate puzzle',
      details: error.message 
    });
  }
});

// Get hint for puzzle
app.post('/api/brainplex/hint', async (req, res) => {
  try {
    const { puzzleType, question, difficulty, useAI = false } = req.body;
    
    if (!puzzleType || !question) {
      return res.status(400).json({ 
        success: false, 
        error: 'Puzzle type and question are required' 
      });
    }
    
    // Try to find puzzle in database first
    let hint = null;
    
    // Search through all puzzles to find matching question
    for (const mode in puzzles) {
      for (const diff in puzzles[mode]) {
        const foundPuzzle = puzzles[mode][diff].find(p => p.question === question);
        if (foundPuzzle && foundPuzzle.hint) {
          hint = foundPuzzle.hint;
          break;
        }
      }
      if (hint) break;
    }
    
    // If no hint in database and AI is available, generate one
    if (!hint && useAI && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a puzzle hint generator. Provide helpful but not too revealing hints for brain teasers."
            },
            {
              role: "user",
              content: `Provide a helpful hint for this ${difficulty} ${puzzleType} puzzle:\n\n"${question}"\n\nHint should guide the user toward the solution without giving it away.`
            }
          ],
          max_tokens: 100,
          temperature: 0.7,
        });
        
        hint = completion.choices[0].message.content;
      } catch (aiError) {
        console.error('AI hint generation failed:', aiError);
      }
    }
    
    // Fallback generic hint
    if (!hint) {
      const genericHints = {
        'Logical Reasoning': 'Break down the problem into smaller parts and look for logical relationships.',
        'Pattern Recognition': 'Look for mathematical operations or repeating sequences between elements.',
        'Mathematical Thinking': 'Try to isolate variables and work step by step.',
        'Verbal Intelligence': 'Consider word categories, synonyms, antonyms, or context.',
        'Memory Challenge': 'Try to create a story or association with the items to remember them better.'
      };
      
      hint = genericHints[puzzleType] || 'Think carefully about the problem and try different approaches.';
    }
    
    res.json({
      success: true,
      hint: hint,
      source: hint.includes('database') ? 'database' : 'ai',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting hint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get hint' 
    });
  }
});

// Get detailed explanation
app.post('/api/brainplex/explanation', async (req, res) => {
  try {
    const { puzzleType, question, userAnswer, correctAnswer, difficulty, useAI = false } = req.body;
    
    if (!question || !correctAnswer) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question and correct answer are required' 
      });
    }
    
    // Try to find puzzle in database first
    let explanation = null;
    
    // Search through all puzzles to find matching question
    for (const mode in puzzles) {
      for (const diff in puzzles[mode]) {
        const foundPuzzle = puzzles[mode][diff].find(p => p.question === question);
        if (foundPuzzle && foundPuzzle.explanation) {
          explanation = foundPuzzle.explanation;
          break;
        }
      }
      if (explanation) break;
    }
    
    // If no explanation in database and AI is available, generate one
    if (!explanation && useAI && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a puzzle explanation generator. Provide detailed, educational explanations for brain teaser solutions."
            },
            {
              role: "user",
              content: `Provide a detailed explanation for this ${difficulty} ${puzzleType} puzzle:\n\nQuestion: "${question}"\n\nCorrect Answer: "${correctAnswer}"\n\nUser's Answer: "${userAnswer || 'Not provided'}"\n\nExplain why the correct answer is right and how to arrive at it.`
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        });
        
        explanation = completion.choices[0].message.content;
      } catch (aiError) {
        console.error('AI explanation generation failed:', aiError);
      }
    }
    
    // Fallback explanation
    if (!explanation) {
      explanation = `The correct answer is "${correctAnswer}". This solution follows logical reasoning principles and problem-solving techniques appropriate for a ${difficulty} difficulty ${puzzleType} puzzle.`;
      
      if (userAnswer && userAnswer !== correctAnswer) {
        explanation += `\n\nYour answer "${userAnswer}" was incorrect. Consider reviewing the problem statement and trying a different approach.`;
      }
    }
    
    res.json({
      success: true,
      explanation: explanation,
      source: explanation.includes('database') ? 'database' : 'ai',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting explanation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get explanation' 
    });
  }
});

// Verify answer
app.post('/api/brainplex/verify', (req, res) => {
  try {
    const { userAnswer, correctAnswer, sequenceId } = req.body;
    
    if (userAnswer === undefined || correctAnswer === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both userAnswer and correctAnswer are required' 
      });
    }
    
    // For memory puzzles with sequenceId
    if (sequenceId && memorySequences.has(sequenceId)) {
      const memoryData = memorySequences.get(sequenceId);
      const isCorrect = userAnswer.trim().toLowerCase() === memoryData.answer.toLowerCase();
      
      // Clean up after verification
      memorySequences.delete(sequenceId);
      
      return res.json({
        success: true,
        isCorrect: isCorrect,
        correctAnswer: memoryData.answer,
        userAnswer: userAnswer,
        type: 'memory',
        timestamp: new Date().toISOString()
      });
    }
    
    // For regular puzzles
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    
    res.json({
      success: true,
      isCorrect: isCorrect,
      correctAnswer: correctAnswer,
      userAnswer: userAnswer,
      type: 'regular',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error verifying answer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify answer' 
    });
  }
});

// Generate puzzle with AI (direct endpoint)
app.post('/api/brainplex/ai-generate', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ 
        success: false, 
        error: 'AI generation requires OpenAI API key' 
      });
    }
    
    const { mode, difficulty = 'medium', previousQuestions = [] } = req.body;
    
    if (!mode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Puzzle mode is required' 
      });
    }
    
    console.log(`🤖 AI Generating ${mode} puzzle (${difficulty})`);
    
    const aiPuzzle = await generatePuzzleWithAI(mode, difficulty, previousQuestions);
    
    res.json({
      success: true,
      puzzle: aiPuzzle,
      source: 'ai',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI puzzle generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate AI puzzle',
      details: error.message 
    });
  }
});

// ========== STUDENT COMPANION AI ROUTES ==========
app.post('/api/chat', async (req, res) => {
  try {
    console.log('📨 Received chat request');
    
    const { messages, attachments = [], user, notes_context } = req.body;
    
    if (!messages) {
      return res.status(400).json({ error: 'Messages are required' });
    }
    
    console.log(`🤖 Chat request from ${user || 'anonymous'}, attachments: ${attachments?.length || 0}`);
    
    // Prepare messages for OpenAI
    const openaiMessages = [];
    
    openaiMessages.push({
      role: "system",
      content: `You are an intelligent AI study assistant for students. Your name is "Study Buddy". Help with homework, study techniques, note organization, exam preparation, and programming. Be thorough and helpful.
      
IMPORTANT: You can analyze images and documents. When users provide visual content or files, you can:
1. Describe images in detail
2. Read text from images (handwritten notes, diagrams, etc.)
3. Analyze document content (PDFs, Word docs, text files)
4. Extract and summarize information from files
5. Answer questions about visual content
6. Help organize study materials
7. Create study plans and schedules
8. Explain complex concepts in simple terms

Be comprehensive in your analysis. Always maintain a helpful, encouraging tone.`
    });

    // Convert history messages
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        const msgAttachments = msg.attachments || [];
        
        if (msgAttachments.length > 0 && msg.role === 'user') {
          const content = [
            { type: "text", text: msg.content || "I have some files I'd like you to analyze:" }
          ];
          
          for (const att of msgAttachments) {
            if (att.type === 'photo' && att.data) {
              content.push({
                type: "image_url",
                image_url: {
                  url: att.data,
                  detail: "high"
                }
              });
            } else if (att.type === 'note' && att.content) {
              content.push({
                type: "text",
                text: `Note: ${att.title || 'Untitled Note'}\n\nContent: ${att.content}\n\nTags: ${att.tags ? att.tags.join(', ') : 'No tags'}`
              });
            } else if (att.type === 'file' && att.name) {
              content.push({
                type: "text",
                text: `File: ${att.name}\nDescription: ${att.description || 'No description provided'}\nType: ${att.type}`
              });
            }
          }
          
          openaiMessages.push({
            role: "user",
            content: content
          });
        } else {
          openaiMessages.push({
            role: msg.role === 'user' ? "user" : "assistant",
            content: msg.content || ""
          });
        }
      }
    }

    // Add current attachments if any
    if (attachments.length > 0) {
      const content = [
        { type: "text", text: req.body.message || "Please analyze these files:" }
      ];
      
      for (const att of attachments) {
        if (att.type === 'photo' && att.data) {
          content.push({
            type: "image_url",
            image_url: {
              url: att.data,
              detail: "high"
            }
          });
        } else if (att.type === 'note' && att.content) {
          content.push({
            type: "text",
            text: `Note Attachment:\nTitle: ${att.title || 'Untitled Note'}\nContent: ${att.content}\nTags: ${att.tags ? att.tags.join(', ') : 'No tags'}`
          });
        } else if (att.type === 'file' && att.name) {
          content.push({
            type: "text",
            text: `File Attachment:\nName: ${att.name}\nType: ${att.type}\nDescription: ${att.description || 'No description'}`
          });
        }
      }
      
      openaiMessages.push({
        role: "user",
        content: content
      });
    }

    // Use GPT-4o-mini for all requests
    const model = "gpt-4o-mini";

    console.log(`📤 Using model: ${model}, Message count: ${openaiMessages.length}`);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: model,
      messages: openaiMessages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    
    console.log('✅ AI Response generated successfully');
    
    res.json({
      reply: aiResponse,
      model: model,
      tokens: completion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
    
    const fallbackResponse = `Hello! I'm your Study Buddy AI assistant. 

I encountered an issue processing your request: ${error.message}

Here's what I can help you with:
📚 Academic Support • 🖼️ Image Analysis • 📄 Document Processing • 💻 Programming Help • 📝 Note Organization

Try rephrasing your question or uploading files/images for analysis!`;

    res.json({
      reply: fallbackResponse,
      error: error.message,
      model: 'fallback',
      timestamp: new Date().toISOString()
    });
  }
});

// Other Student Companion routes remain the same...
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    const { prompt = "What's in this image?", description = "" } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`🖼️ Image analysis request: ${imageFile.originalname}, Size: ${imageFile.size} bytes`);
    
    // Convert image to base64
    const base64Image = encodeImageToBase64(imageFile.buffer, imageFile.mimetype);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a visual analysis AI specializing in educational content. Describe images in detail, read text from images, analyze diagrams, and provide educational insights. Focus on clarity and educational value."
        },
        {
          role: "user",
          content: [
            { type: "text", text: `${prompt}\n\n${description ? `Context: ${description}\n\nPlease analyze this image for educational purposes:` : 'Please analyze this image:'}` },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;
    
    console.log('✅ Image analysis completed');
    
    res.json({
      analysis: analysis,
      fileName: imageFile.originalname,
      fileSize: imageFile.size,
      mimeType: imageFile.mimetype,
      tokens: completion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Image analysis error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze image', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/analyze-document', upload.single('document'), async (req, res) => {
  try {
    const { prompt = "Analyze this document for study purposes:", description = "" } = req.body;
    const documentFile = req.file;
    
    if (!documentFile) {
      return res.status(400).json({ error: 'No document file provided' });
    }

    console.log(`📄 Document analysis request: ${documentFile.originalname}, Type: ${documentFile.mimetype}`);
    
    let extractedText = '';
    const mimeType = documentFile.mimetype;
    const fileName = documentFile.originalname;
    
    // Extract text based on file type
    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPDF(documentFile.buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await extractTextFromDOCX(documentFile.buffer);
    } else if (mimeType === 'text/plain') {
      extractedText = extractTextFromTXT(documentFile.buffer);
    } else {
      return res.status(400).json({ 
        error: 'Unsupported document type. Please upload PDF, DOCX, or TXT files.',
        supportedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from document or document is empty' });
    }

    console.log(`📖 Extracted ${extractedText.length} characters from document`);
    
    // Truncate if too long
    const maxChars = 15000;
    if (extractedText.length > maxChars) {
      extractedText = extractedText.substring(0, maxChars) + "\n\n[Document truncated due to length. First 15,000 characters shown.]";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a document analysis AI specialized in educational content. Read and analyze documents, extract key information, summarize content, create study guides, and answer questions about the document from a student's perspective."
        },
        {
          role: "user",
          content: `${prompt}\n\n${description ? `Context: ${description}\n\n` : ''}DOCUMENT: "${fileName}"\n\nCONTENT:\n${extractedText}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;
    
    console.log('✅ Document analysis completed');
    
    res.json({
      analysis: analysis,
      fileName: fileName,
      fileType: mimeType,
      extractedLength: extractedText.length,
      tokens: completion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Document analysis error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze document', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`🔍 Web search request: ${query.substring(0, 100)}...`);
    
    // Simulated search results
    const simulatedResults = [
      {
        title: "Study Techniques for Students",
        snippet: "Effective study techniques include spaced repetition, active recall, and the Pomodoro method. Research shows these methods improve retention and understanding.",
        source: "Educational Psychology Journal",
        relevance: "High",
        url: "#study-techniques"
      },
      {
        title: "Academic Research Resources",
        snippet: "For academic research, consider using Google Scholar, JSTOR, PubMed, or your university's library database. These provide peer-reviewed academic sources.",
        source: "Academic Resources Guide",
        relevance: "Medium",
        url: "#research-resources"
      },
      {
        title: "Note-taking Methods Comparison",
        snippet: "Popular note-taking methods include Cornell Notes, Mind Mapping, and Outline Method. Each has advantages for different learning styles and subjects.",
        source: "Learning Strategies Review",
        relevance: "High",
        url: "#note-taking-methods"
      }
    ];
    
    res.json({
      results: simulatedResults,
      query: query,
      count: simulatedResults.length,
      timestamp: new Date().toISOString(),
      note: "This is a simulated search. In production, integrate with a search API like Google Search, SerpAPI, or Tavily."
    });
    
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== ERROR HANDLING ==========
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      health: {
        'GET /api/health': 'Combined health check',
        'GET /health': 'Simple health check'
      },
      studentCompanion: {
        'POST /api/chat': 'AI chat with multimodal support',
        'POST /api/search': 'Web search (simulated)',
        'POST /api/analyze-image': 'Image analysis',
        'POST /api/analyze-document': 'Document analysis'
      },
      brainPlex: {
        'GET /api/brainplex/puzzles': 'Get available puzzles count',
        'POST /api/brainplex/generate': 'Generate brain teaser puzzle',
        'POST /api/brainplex/hint': 'Get hint for puzzle',
        'POST /api/brainplex/explanation': 'Get detailed explanation',
        'POST /api/brainplex/verify': 'Verify answer',
        'POST /api/brainplex/ai-generate': 'Generate puzzle with AI'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again.',
    timestamp: new Date().toISOString()
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Merged Server running on port ${PORT}`);
  console.log(`🎓 Student Companion AI: Enabled`);
  console.log(`🧠 BrainPlex Brain Teaser: Enabled`);
  console.log(`🤖 OpenAI model: gpt-4o-mini (multimodal capable)`);
  console.log(`🔑 API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🔒 CORS enabled for:`, allowedOrigins);
  console.log(`🧩 BrainPlex puzzles loaded:`);
  for (const mode in puzzles) {
    for (const difficulty in puzzles[mode]) {
      console.log(`   ${mode} - ${difficulty}: ${puzzles[mode][difficulty].length} puzzles`);
    }
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY environment variable is not set!');
    console.warn('   AI features will be limited. Create a .env file with: OPENAI_API_KEY=your_key_here');
  }
});

module.exports = app;
