import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-name.onrender.com'] // Replace with your actual Render URL
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- Gemini AI Setup ---
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY environment variable is not set.");
  console.log("Available env vars:", Object.keys(process.env).filter(key => key.includes('API')));
  process.exit(1);
}

console.log("✅ API Key found, initializing Gemini AI...");

const genAI = new GoogleGenerativeAI(API_KEY);
const TARGET_WEBSITE = "www.vidyamandir.org";

const systemInstruction = `You are a friendly and helpful AI assistant for Vidya Mandir in Palanpur. Your name is VidyaBot. Your sole purpose is to answer questions based *only* on the information available on the official Vidya Mandir website (${TARGET_WEBSITE}) related to the Palanpur branch.

Key Guidelines:
- You must only answer questions about the Vidya Mandir school located in Palanpur.
- Always assume that terms like "your school", "this institution", or "vidyamandir" are referring to Vidya Mandir in Palanpur.
- If you find information about Vidya Mandir in other cities, explicitly ignore it and state that you can only provide information about the Palanpur branch.
- Do not provide information about any other school or any other branch of Vidya Mandir.
- If a question is not related to Vidya Mandir of Palanpur or its programs, politely decline to answer and state that you can only provide information about Vidya Mandir in Palanpur.
- Use the provided search results from the website to formulate your answer, focusing only on content relevant to the Palanpur location.
- Keep your answers conversational and concise.
- You have memory of the current conversation. Use it to answer follow-up questions appropriately.`;

/**
 * Converts the client-side message history into the format required by the Gemini API.
 */
const convertHistoryToGeminiFormat = (clientHistory) => {
  if (!Array.isArray(clientHistory)) {
    console.warn("Invalid history format, returning empty array");
    return [];
  }
  
  // Exclude the initial bot greeting and the latest user message
  const historyForGemini = clientHistory.slice(1, -1);
  return historyForGemini
    .filter(msg => msg && msg.sender && msg.text && msg.text.trim())
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));
};

// --- API Routes ---
app.post('/api/chat', async (req, res) => {
  console.log('📨 Received chat request');
  
  // Set response headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  try {
    const { message, history } = req.body;
    
    console.log('Request details:', { 
      messageLength: message?.length, 
      historyLength: Array.isArray(history) ? history.length : 'invalid',
      messagePreview: message?.substring(0, 50) + '...'
    });
    
    // Validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.warn('❌ Invalid message format');
      return res.status(400).json({ 
        error: 'A valid non-empty message string is required.',
        received: { type: typeof message, length: message?.length }
      });
    }
    
    if (!Array.isArray(history)) {
      console.warn('❌ Invalid history format');
      return res.status(400).json({ 
        error: 'A valid history array is required.',
        received: typeof history
      });
    }
    
    const geminiHistory = convertHistoryToGeminiFormat(history);
    console.log('📝 Processed history length:', geminiHistory.length);

    try {
      // Initialize the model with updated configuration
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // Using stable model
        systemInstruction: systemInstruction,
        tools: [{ googleSearchRetrieval: {} }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });

      console.log('🤖 Starting chat with Gemini...');
      
      const chat = model.startChat({
        history: geminiHistory,
      });

      const result = await chat.sendMessage(message);
      const response = result.response;
      const text = response.text();
      
      console.log('✅ Got response from Gemini, length:', text?.length);

      // Extract sources with better error handling
      let sources = [];
      try {
        const candidates = response.candidates || [];
        const groundingMetadata = candidates[0]?.groundingMetadata;
        const groundingChunks = groundingMetadata?.groundingChunks || [];
        
        const rawSources = groundingChunks
          .map(chunk => chunk.web)
          .filter(web => web && web.uri && web.title);
          
        // Remove duplicates
        sources = rawSources.reduce((acc, current) => {
          if (!acc.some(item => item.uri === current.uri)) {
            acc.push({
              uri: current.uri,
              title: current.title
            });
          }
          return acc;
        }, []);
        
        console.log('📚 Sources extracted:', sources.length);
      } catch (sourceError) {
        console.warn('⚠️ Error extracting sources:', sourceError.message);
        sources = [];
      }

      const responseData = { 
        text: text || "I apologize, but I couldn't generate a response. Please try again.",
        sources 
      };
      
      return res.json(responseData);

    } catch (geminiError) {
      console.error('❌ Gemini API Error:', {
        message: geminiError.message,
        status: geminiError.status,
        code: geminiError.code
      });
      
      // Handle specific Gemini API errors
      if (geminiError.message?.includes('API_KEY') || geminiError.message?.includes('authentication')) {
        return res.status(500).json({ 
          error: 'Authentication error with AI service. Please contact support.' 
        });
      }
      
      if (geminiError.message?.includes('quota') || geminiError.message?.includes('limit')) {
        return res.status(429).json({ 
          error: 'Service temporarily unavailable due to high demand. Please try again in a moment.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'AI service is currently unavailable. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
      });
    }

  } catch (error) {
    console.error("❌ Unexpected error in /api/chat:", error);
    
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!API_KEY,
    port: port
  });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is running!',
    env: process.env.NODE_ENV,
    hasApiKey: !!API_KEY
  });
});

// --- Static File Serving ---
// Serve built React app
const distPath = path.join(__dirname, 'dist');
console.log('📁 Serving static files from:', distPath);
app.use(express.static(distPath));

// Fallback for client-side routing (SPA)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// --- Server Startup ---
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 VidyaBot server listening on port ${port}`);
  console.log(`📡 API endpoint: http://localhost:${port}/api/chat`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});