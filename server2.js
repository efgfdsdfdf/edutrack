require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI with API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active memory sequences (in production, use Redis)
const memorySequences = new Map();

// Generate IQ test questions
app.post('/api/generate-puzzle', async (req, res) => {
  try {
    const { mode, difficulty, userId, previousQuestions = [] } = req.body;
    
    // Prevent repetition by sending previous questions to AI
    const previousQuestionsText = previousQuestions.length > 0 
      ? `Avoid these questions: ${previousQuestions.join('; ')}. `
      : '';
    
    const prompt = getPromptForMode(mode, difficulty, previousQuestionsText);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert IQ test creator. Generate challenging but fair IQ test questions. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const puzzle = JSON.parse(completion.choices[0].message.content);
    
    // For memory challenges, store the sequence
    if (mode === 'memory') {
      const sequenceId = `${userId}_${Date.now()}`;
      memorySequences.set(sequenceId, {
        sequence: puzzle.sequence,
        answer: puzzle.answer,
        expiresAt: Date.now() + 300000 // 5 minutes
      });
      puzzle.sequenceId = sequenceId;
    }

    res.json({ success: true, puzzle });
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
app.post('/api/get-hint', async (req, res) => {
  try {
    const { puzzle, question, difficulty } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an IQ test expert. Provide a helpful hint without giving away the answer."
        },
        {
          role: "user",
          content: `Puzzle: ${puzzle}\nQuestion: ${question}\nDifficulty: ${difficulty}\n\nProvide a helpful hint:`
        }
      ],
      temperature: 0.5,
      max_tokens: 100,
    });

    res.json({ 
      success: true, 
      hint: completion.choices[0].message.content 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify memory challenge answer
app.post('/api/verify-memory', (req, res) => {
  const { sequenceId, userAnswer } = req.body;
  
  const memoryData = memorySequences.get(sequenceId);
  
  if (!memoryData) {
    return res.json({ success: false, error: 'Sequence expired or not found' });
  }
  
  // Clean up old sequences
  if (Date.now() > memoryData.expiresAt) {
    memorySequences.delete(sequenceId);
    return res.json({ success: false, error: 'Sequence expired' });
  }
  
  const isCorrect = memoryData.answer.toLowerCase() === userAnswer.toLowerCase();
  
  // Clean up after verification
  memorySequences.delete(sequenceId);
  
  res.json({ 
    success: true, 
    isCorrect,
    correctAnswer: memoryData.answer
  });
});

// Get explanation
app.post('/api/get-explanation', async (req, res) => {
  try {
    const { puzzle, question, answer, difficulty } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an IQ test expert. Explain the solution clearly."
        },
        {
          role: "user",
          content: `Puzzle: ${puzzle}\nQuestion: ${question}\nCorrect Answer: ${answer}\nDifficulty: ${difficulty}\n\nExplain the solution:`
        }
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    res.json({ 
      success: true, 
      explanation: completion.choices[0].message.content 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getPromptForMode(mode, difficulty, previousQuestions) {
  const difficultyLevels = {
    easy: "Beginner level - simple patterns and basic logic",
    medium: "Intermediate level - requires some reasoning",
    hard: "Advanced level - complex patterns and deep thinking",
    pro: "Expert level - requires exceptional cognitive abilities"
  };

  const modePrompts = {
    logical: `Generate a logical reasoning puzzle for ${difficultyLevels[difficulty]}. 
              Format: JSON with keys: question, options (array of 4 strings), answer (exact string from options), explanation, type, difficulty, hint.
              Example: {"question": "If all cats are mammals and all mammals are animals, then:", "options": ["All cats are animals", "Some cats are not animals", "All animals are cats", "Some mammals are not cats"], "answer": "All cats are animals", "explanation": "This is a syllogism...", "type": "Logical Reasoning", "difficulty": "${difficulty}", "hint": "Think about the relationship..."}`,
    
    pattern: `Generate a pattern recognition puzzle for ${difficultyLevels[difficulty]}.
              Format: JSON with keys: question, pattern (array), options, answer, explanation, type, difficulty, hint.
              Example: {"question": "What comes next: △, □, ◯, △, □, ?", "pattern": ["△", "□", "◯", "△", "□"], "options": ["◯", "△", "□", "☆"], "answer": "◯", "explanation": "The pattern repeats every three shapes...", "type": "Pattern Recognition", "difficulty": "${difficulty}", "hint": "Look for repeating sequences..."}`,
    
    memory: `Generate a memory challenge for ${difficultyLevels[difficulty]}.
              Format: JSON with keys: sequence (array of items to remember), question, options, answer, explanation, type, difficulty, hint.
              For easy: 3-4 items, medium: 5-6 items, hard: 7-8 items, pro: 9-10 items.
              Example: {"sequence": ["Red", "Blue", "Green", "Yellow"], "question": "What was the third color in the sequence?", "options": ["Red", "Blue", "Green", "Yellow"], "answer": "Green", "explanation": "The sequence was: Red, Blue, Green, Yellow", "type": "Memory Challenge", "difficulty": "${difficulty}", "hint": "Try to visualize the sequence..."}`,
    
    math: `Generate a mathematical reasoning puzzle for ${difficultyLevels[difficulty]}.
            Format: JSON with keys: question, options, answer, explanation, type, difficulty, hint.
            Example: {"question": "If 2x + 5 = 15, what is x?", "options": ["5", "10", "7.5", "8"], "answer": "5", "explanation": "2x = 15 - 5 = 10, so x = 10/2 = 5", "type": "Mathematical Thinking", "difficulty": "${difficulty}", "hint": "Isolate x by moving constants to the other side..."}`,
    
    verbal: `Generate a verbal intelligence puzzle for ${difficultyLevels[difficulty]}.
              Format: JSON with keys: question, options, answer, explanation, type, difficulty, hint.
              Example: {"question": "Which word is most different: Apple, Orange, Banana, Carrot?", "options": ["Apple", "Orange", "Banana", "Carrot"], "answer": "Carrot", "explanation": "Carrot is a vegetable while others are fruits", "type": "Verbal Intelligence", "difficulty": "${difficulty}", "hint": "Think about categories..."}`
  };

  return `${previousQuestions}${modePrompts[mode] || modePrompts.logical}`;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});