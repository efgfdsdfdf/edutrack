// server.js - Fixed backend for Student Companion AI

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, ".")));

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" });

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Web scraping function for web search
async function webSearch(query, maxResults = 5) {
  try {
    // Use DuckDuckGo HTML or other search engine
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    $('.result__title').slice(0, maxResults).each((i, elem) => {
      const title = $(elem).text().trim();
      const link = $(elem).find('a').attr('href');
      const snippet = $(elem).next('.result__snippet').text().trim();
      
      if (title && link) {
        results.push({
          title: title,
          url: link,
          snippet: snippet || 'No description available',
          date: new Date().toISOString().split('T')[0]
        });
      }
    });
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error("Search error:", error.message);
    return null;
  }
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Student Companion AI Backend is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/keepalive", (req, res) => {
  res.json({ 
    status: "alive", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Web search endpoint
app.post("/api/search", async (req, res) => {
  try {
    const { query, max_results = 5 } = req.body;
    
    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Query is required" });
    }
    
    console.log(`🔍 Performing web search for: ${query}`);
    
    const searchResults = await webSearch(query, max_results);
    
    if (searchResults) {
      res.json({ results: searchResults });
    } else {
      // Fallback to mock results
      const mockResults = [
        {
          title: "Web Search Example Result 1",
          url: "https://example.com/result1",
          snippet: "This is an example search result about " + query,
          date: new Date().toISOString().split('T')[0]
        },
        {
          title: "Web Search Example Result 2",
          url: "https://example.com/result2",
          snippet: "More information about " + query,
          date: new Date().toISOString().split('T')[0]
        }
      ];
      res.json({ results: mockResults });
    }
  } catch (error) {
    console.error("Search endpoint error:", error);
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

// Chat endpoint with OpenAI
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, max_tokens = 2000, temperature = 0.7, user } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }
    
    console.log(`💬 Chat request from ${user || 'unknown'}, messages: ${messages.length}`);
    
    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      return res.status(500).json({ 
        error: "Server configuration error",
        message: "OpenAI API key is not configured on the server"
      });
    }
    
    // Prepare messages for OpenAI
    const openaiMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Call OpenAI API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo-preview", // or "gpt-3.5-turbo"
        messages: openaiMessages,
        max_tokens: max_tokens,
        temperature: temperature,
        user: user || "anonymous"
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    const aiResponse = response.data.choices[0].message.content;
    
    res.json({ 
      reply: aiResponse,
      model: response.data.model,
      usage: response.data.usage
    });
    
  } catch (error) {
    console.error("Chat endpoint error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: "Invalid API key",
        message: "The OpenAI API key is invalid or expired"
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later."
      });
    }
    
    // Return a fallback response
    const fallbackResponse = `I'm having trouble connecting to the AI service. Here's what I can tell you based on your query:

**For best results:**
1. Make sure your OpenAI API key is set in the .env file
2. Check that you have sufficient credits in your OpenAI account
3. Ensure the backend server is running properly

In the meantime, I can help you with general study advice or note organization. What specific help do you need with your studies?`;

    res.json({ reply: fallbackResponse });
  }
});

// File upload endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const file = req.file;
    
    res.json({
      success: true,
      filename: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "File upload failed" });
  }
});

// Serve main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Student Companion AI Backend running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
