//npmserver.js - Student Companion AI Backend with Multimodal Support
// Updated for GitHub Pages deployment

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const PDFParser = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced CORS configuration for GitHub Pages
const allowedOrigins = [
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https:// https://efgfdsdfdf.github.io', // Your GitHub Pages URL
  'https:// https://efgfdsdfdf.github.io', // Exact URL
  'https://*.github.io', // Allow all GitHub Pages
  'https://edutrack-2-2ufp.onrender.com' // Your Render backend
];

// More flexible CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow all GitHub Pages
    if (origin.includes('.github.io')) {
      return callback(null, true);
    }
    
    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(null, true); // Allow anyway for testing - change to callback(new Error()) in production
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Student Companion AI Backend',
    version: '1.0.0',
    openai_configured: !!process.env.OPENAI_API_KEY,
    origins_allowed: allowedOrigins
  });
});

app.get('/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Student Companion AI Backend',
    version: '1.0.0'
  });
});

app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    service: 'Student Companion AI Backend',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      search: '/api/search',
      analyzeImage: '/api/analyze-image',
      analyzeDocument: '/api/analyze-document'
    },
    cors: {
      enabled: true,
      allowed_origins: allowedOrigins
    }
  });
});

// Storage configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to encode image to base64
function encodeImageToBase64(imageBuffer, mimeType) {
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

// Helper function to extract text from PDF
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await PDFParser(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

// Helper function to extract text from DOCX
async function extractTextFromDOCX(docxBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

// Helper function to extract text from TXT
function extractTextFromTXT(txtBuffer) {
  return txtBuffer.toString('utf-8');
}

// Main chat endpoint with multimodal support
app.post('/api/chat', async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('📨 Received chat request');
    
    const { messages, attachments = [], user, notes_context } = req.body;
    
    if (!messages) {
      return res.status(400).json({ error: 'Messages are required' });
    }
    
    console.log(`🤖 Chat request from ${user || 'anonymous'}, attachments: ${attachments?.length || 0}`);
    
    // Prepare messages for OpenAI
    const openaiMessages = [];
    
    // Enhanced system prompt for student assistance
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

    // Use GPT-4o-mini for all requests (supports text and vision)
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
    
    // More informative fallback response
    const fallbackResponse = `Hello! I'm your Study Buddy AI assistant. 

I encountered an issue processing your request: ${error.message}

Here's what I can help you with:

📚 **Academic Support:**
• Homework help and explanations
• Study techniques and organization
• Exam preparation strategies
• Concept explanations in simple terms

🖼️ **Image Analysis:**
• Analyze photos, diagrams, and screenshots
• Read handwritten notes
• Describe visual content in detail
• Extract text from images

📄 **Document Processing:**
• Read and analyze PDFs, Word documents, text files
• Summarize long documents
• Extract key information
• Organize study materials

💻 **Programming Help:**
• Code explanations
• Debugging assistance
• Algorithm explanations
• Project guidance

📝 **Note Organization:**
• Summarize your notes
• Create study guides
• Generate flashcards
• Organize by topics

Try rephrasing your question or uploading files/images for analysis!`;

    res.json({
      reply: fallbackResponse,
      error: error.message,
      model: 'fallback',
      timestamp: new Date().toISOString()
    });
  }
});

// Image analysis endpoint
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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

// Document analysis endpoint
app.post('/api/analyze-document', upload.single('document'), async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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
    
    // Truncate if too long (OpenAI has token limits)
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

// Web search endpoint (simulated)
app.post('/api/search', async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      'GET /api/health': 'Health check',
      'POST /api/chat': 'AI chat with multimodal support',
      'POST /api/search': 'Web search (simulated)',
      'POST /api/analyze-image': 'Image analysis',
      'POST /api/analyze-document': 'Document analysis'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again.',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 OpenAI model: gpt-4o-mini (multimodal capable)`);
  console.log(`🔑 API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🔒 CORS enabled for:`, allowedOrigins);
  console.log(`🌍 Your GitHub Pages URL: https://efgfdsdfdf.github.io`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ WARNING: OPENAI_API_KEY environment variable is not set!');
    console.error('   Create a .env file with: OPENAI_API_KEY=your_key_here');
    console.error('   Or set it as an environment variable in your deployment.');
  }
});

module.exports = app;

