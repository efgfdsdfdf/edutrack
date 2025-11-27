import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

dotenv.config();

// ===== Environment Validation =====
function validateEnvironment() {
  const required = ['DEEPSEEK_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  // Add this right after the imports, before other middleware
console.log('=== Server Starting ===');
console.log('Current directory:', process.cwd());
console.log('Static files path:', path.join(process.cwd(), "first code"));
console.log('Directory exists:', fs.existsSync(path.join(process.cwd(), "first code")));

// List files in the static directory
try {
  const staticPath = path.join(process.cwd(), "first code");
  if (fs.existsSync(staticPath)) {
    const files = fs.readdirSync(staticPath);
    console.log('Files in static directory:', files);
  } else {
    console.log('❌ Static directory does not exist!');
  }
} catch (err) {
  console.log('Error reading static directory:', err.message);
}

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.log('💡 Make sure to create a .env file with:');
    console.log('DEEPSEEK_API_KEY=your_deepseek_api_key_here');
    console.log('JWT_SECRET=your_jwt_secret_here (optional)');
    console.log('PORT=5501 (optional)');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}

validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5501;

// ===== Rate Limiting =====
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // limit each IP to 15 requests per minute
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per 15 minutes
  message: { error: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== CORS Configuration =====
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// ===== Middleware =====
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "first code")));
// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== Multer Setup with Validation =====
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ===== Config =====
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
const DEEPSEEK_TEXT_URL = "https://api.deepseek.com/chat/completions";
const JWT_SECRET = process.env.JWT_SECRET || "student_secret_key_change_in_production";
const CHAT_DB = path.join(process.cwd(), "chat_history.json");

// ===== Utility Functions =====
function loadChats() {
  try {
    if (!fs.existsSync(CHAT_DB)) {
      fs.writeFileSync(CHAT_DB, "{}");
      return {};
    }
    return JSON.parse(fs.readFileSync(CHAT_DB, "utf8"));
  } catch (err) {
    console.error("Failed to load chat history:", err);
    return {};
  }
}

function saveChats(chats) {
  try {
    fs.writeFileSync(CHAT_DB, JSON.stringify(chats, null, 2));
  } catch (err) {
    console.error("Failed to save chat history:", err);
  }
}

function cleanupFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete temp file:', err);
    });
  }
}

// ===== Auth Middleware =====
function verifyUser(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ===== Routes =====

// Serve main app
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "first code", "ai.html"));
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "✅ Server is running fine.",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// API Key Validation
app.get("/api/verify-key", async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ valid: false, error: "API key not configured" });
  }

  try {
    const response = await fetch(DEEPSEEK_TEXT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Say 'API key is working' if you receive this." }],
        max_tokens: 10
      }),
    });

    if (response.ok) {
      res.json({ valid: true, message: "API key is valid" });
    } else {
      const error = await response.text();
      res.status(400).json({ valid: false, error: "API key validation failed" });
    }
  } catch (err) {
    res.status(500).json({ valid: false, error: "Network error during validation" });
  }
});

// Login with rate limiting
app.post("/api/login", authLimiter, (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: "Valid username required" });
  }

  const cleanUsername = username.trim().slice(0, 50); // Limit username length

  try {
    const token = jwt.sign({ username: cleanUsername }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    const chats = loadChats();
    if (!chats[cleanUsername]) {
      chats[cleanUsername] = [];
    }
    saveChats(chats);

    res.json({ message: `Welcome, ${cleanUsername}!`, username: cleanUsername });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Check login status
app.get("/api/user", verifyUser, (req, res) => {
  const { username } = req.user;
  const chats = loadChats();
  const history = chats[username] || [];
  res.json({ username, history });
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully." });
});

// ===== AI Text Chat =====
app.post("/api/ask", verifyUser, chatLimiter, async (req, res) => {
  const { message } = req.body;
  const username = req.user.username;
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Message required" });
  }

  const cleanMessage = message.trim().slice(0, 2000); // Limit message length

  try {
    const chats = loadChats();
    const userHistory = chats[username] || [];

    const response = await fetch(DEEPSEEK_TEXT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are Student Companion AI - a helpful, friendly assistant for students. The logged in student is ${username}. Provide educational support, answer questions, and help with learning. Be concise but thorough.`,
          },
          ...userHistory.slice(-10).map((c) => ({ 
            role: c.role || "user", 
            content: c.user 
          })),
          { role: "user", content: cleanMessage },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API Error:', response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({
          reply: "⏳ Rate limit exceeded. Please wait a moment before trying again."
        });
      }
      
      if (response.status === 402 || errorText.includes("Insufficient balance") || errorText.includes("quota")) {
        return res.status(402).json({
          reply: "💰 Your DeepSeek account has no remaining credits. Please top up your balance to continue chatting."
        });
      }

      if (response.status === 401 || errorText.includes("Invalid") || errorText.includes("unauthorized")) {
        return res.status(401).json({
          reply: "🔑 Invalid or expired DeepSeek API key. Please check your .env file."
        });
      }
      
      if (response.status === 403) {
        return res.status(403).json({
          reply: "🔒 Access forbidden. Please check your API key permissions."
        });
      }

      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "⚠️ No AI response received.";

    // Save to chat history
    userHistory.push({ 
      user: cleanMessage, 
      ai: reply,
      timestamp: new Date().toISOString(),
      role: "user"
    });
    
    // Keep only last 50 messages to prevent database from growing too large
    chats[username] = userHistory.slice(-50);
    saveChats(chats);

    res.json({ username, reply });
  } catch (err) {
    console.error("DeepSeek Error:", err);
    res.status(500).json({
      reply: "❌ Could not reach DeepSeek AI. Please check your internet connection and try again."
    });
  }
});

// ===== Mock AI endpoint (dev helper) =====
app.post('/api/ask-mock', (req, res) => {
  const { message } = req.body || {};
  const reply = `(mock) I received your message: "${(message||'').slice(0,120)}" — this is a mock reply. The real AI would provide a helpful response here.`;
  return res.json({ reply });
});

// ===== Image Upload & DeepSeek Vision Analysis =====
app.post("/analyze-image", verifyUser, chatLimiter, upload.single("image"), async (req, res) => {
  const imagePath = req.file?.path;
  const username = req.user.username;
  
  if (!imagePath) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const response = await fetch(DEEPSEEK_TEXT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are Student Companion AI. The logged in student is ${username}. Analyze the uploaded image and provide helpful educational insights. Describe what you see and offer any relevant learning information.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this image and provide a detailed description with any educational insights that might be helpful for a student."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek Vision API Error:', response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({
          text: "⏳ Rate limit exceeded. Please wait a moment before trying again."
        });
      }
      
      if (response.status === 402 || errorText.includes("Insufficient balance") || errorText.includes("quota")) {
        return res.status(402).json({
          text: "💰 Your DeepSeek account has no remaining credits. Please top up your balance to continue image analysis."
        });
      }

      if (response.status === 401 || errorText.includes("Invalid") || errorText.includes("unauthorized")) {
        return res.status(401).json({
          text: "🔑 Invalid or expired DeepSeek API key. Please check your .env file."
        });
      }

      throw new Error(`Vision API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "⚠️ No AI analysis received.";

    // Save to chat history
    const chats = loadChats();
    if (!chats[username]) chats[username] = [];
    chats[username].push({ 
      user: "[image uploaded for analysis]", 
      ai: reply,
      timestamp: new Date().toISOString(),
      role: "user"
    });
    saveChats(chats);

    res.json({ text: reply });
  } catch (err) {
    console.error("Image analysis error:", err);
    res.status(500).json({
      text: "❌ Could not reach DeepSeek API. Please check your internet connection and try again."
    });
  } finally {
    // Clean up uploaded file after 5 seconds
    if (imagePath) {
      setTimeout(() => cleanupFile(imagePath), 5000);
    }
  }
});

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Add this right before the 404 handler
app.get("/test", (req, res) => {
  res.json({ 
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    staticPath: path.join(process.cwd(), "first code"),
    staticExists: fs.existsSync(path.join(process.cwd(), "first code"))
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Endpoint not found' });
});
// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(process.cwd(), "first code")}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET === "student_secret_key_change_in_production" ? "Using default (change in production)" : "Custom"}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
});