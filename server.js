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
    ? ['https://vidyabot-bkv0.onrender.com'] // Update with your actual Render URL
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
  process.exit(1);
}

console.log("✅ API Key found, initializing Gemini AI...");

const genAI = new GoogleGenerativeAI(API_KEY);

// Comprehensive information about Vidya Mandir Palanpur
const vidyaMandirInfo = `
VIDYA MANDIR PALANPUR - COMPREHENSIVE INFORMATION

CONTACT INFORMATION:
- Location: Palanpur, Gujarat, India
- Official Website: www.vidyamandir.org
- This information is specifically for the Palanpur branch

GENERAL INFORMATION:
- Vidya Mandir Palanpur is an educational institution in Gujarat
- Focuses on quality education and student development
- Part of the Vidya Mandir educational network

ACADEMIC PROGRAMS:
- Primary Education (Classes 1-5)
- Secondary Education (Classes 6-10)
- Higher Secondary Education (Classes 11-12)
- Focus on CBSE curriculum
- Science, Commerce, and Arts streams available

FACILITIES:
- Well-equipped classrooms
- Library and reading rooms
- Computer labs
- Science laboratories
- Sports facilities
- Transportation services

ADMISSION PROCESS:
- Applications typically open in spring/summer
- Age-appropriate admission for different classes
- Document verification required
- Merit-based selection process
- Contact school directly for current admission guidelines

For the most current and detailed information, please visit www.vidyamandir.org or contact the school directly.
`;

const systemInstruction = `You are VidyaBot, a helpful AI assistant for Vidya Mandir school in Palanpur, Gujarat, India. 

Use the following information about Vidya Mandir Palanpur to answer questions:
${vidyaMandirInfo}

IMPORTANT GUIDELINES:
- You can ONLY provide information about Vidya Mandir located in Palanpur, Gujarat
- If users ask about other Vidya Mandir branches, politely clarify you only have information about Palanpur
- For questions not related to Vidya Mandir Palanpur, politely redirect to school-related topics
- Always encourage users to visit www.vidyamandir.org or contact the school for the most current information
- Be helpful, friendly, and conversational
- If you don't have specific information, be honest and direct users to official sources

TOPICS YOU CAN HELP WITH:
- General information about the school
- Academic programs and curriculum
- Admission process and requirements
- School facilities
- Contact information
- Directions to official website

Remember: Always suggest visiting www.vidyamandir.org for the most up-to-date information.`;

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
      // Use Gemini 2.0 Flash - the current stable model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp", // Current model as of August 2025
