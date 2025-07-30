const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const MemoryManager = require('./memoryManager');

let mainWindow;
// In-memory store for conversation state
const conversationState = {};
// Initialize memory manager
const memoryManager = new MemoryManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icons/ys_logo.png'),
    title: 'Young-Scientist.in Math and Chemistry Tutor'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-available-models', async () => {
  try {
    const response = await axios.get('http://localhost:11434/api/tags');
    return response.data.models || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
});

// Get learning progress for a subject
ipcMain.handle('get-learning-progress', async (event, subject) => {
  try {
    await memoryManager.initialize();
    const progress = memoryManager.getLearningProgress(subject);
    return { success: true, progress };
  } catch (error) {
    console.error('Error getting learning progress:', error);
    return { success: false, error: error.message };
  }
});

// Get recent conversation history for a subject
ipcMain.handle('get-conversation-history', async (event, { subject, limit = 10 }) => {
  try {
    await memoryManager.initialize();
    const history = memoryManager.getRecentQuestionsBySubject(subject, limit);
    return { success: true, history };
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return { success: false, error: error.message };
  }
});

// Clean up old memory data
ipcMain.handle('cleanup-memory', async (event, daysToKeep = 30) => {
  try {
    await memoryManager.initialize();
    await memoryManager.cleanup(daysToKeep);
    return { success: true };
  } catch (error) {
    console.error('Error cleaning up memory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-message', async (event, { model, message, subject, contextId }) => {
  try {
    const cleanMessage = message.replace(/^internal check: /, '');
    
    // TEMPORARILY COMMENTED OUT FOR TESTING - FILTERING DISABLED
    // if (!isQuestionAppropriate(cleanMessage, subject)) {
    //   return {
    //     success: false,
    //     error: 'inappropriate_content',
    //     message: "Sorry, I've been trained to answer only science-related questions (Chemistry, Physics, and Mathematics) and cannot respond to other topics or topics with sensitive questions. Please ask me about general science concepts instead!"
    //   };
    // }

    // Initialize memory manager if needed
    await memoryManager.initialize();

    // Get or create conversation context
    const context = conversationState[contextId] || {
      originalQuestion: cleanMessage,
      subject: subject,
      state: 'initial'
    };
    
    // Create session if it's a new context
    if (!conversationState[contextId]) {
      await memoryManager.createSession(contextId, subject, cleanMessage);
    }
    
    // Get memory insights for context-aware responses
    const memoryInsights = memoryManager.generateContextInsights(contextId, cleanMessage, subject);
    
    // Update state based on message
    updateConversationState(context, cleanMessage);
    
    // Handle initial state with simplified response
    if (context.state === 'initial') {
      // Auto-set to detailed explanation for better user experience
      context.state = 'answered_detailed';
    }

    const prompt = await createEnhancedPrompt(context, memoryInsights, cleanMessage);
    
    // TEMPORARILY COMMENTED OUT FOR TESTING - SECONDARY FILTERING DISABLED
    // if (prompt === null) {
    //   return {
    //     success: false,
    //     error: 'inappropriate_content',
    //     message: "Sorry, I've been trained to answer only science-related questions (Chemistry, Physics, and Mathematics) and cannot respond to other topics or topics with sensitive questions. Please ask me about general science concepts instead!"
    //   };
    // }
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false
    });
    
    // Save the conversation to memory
    const responseType = context.state.includes('brief') ? 'brief' : 
                        context.state.includes('detailed') ? 'detailed' : 
                        context.state.includes('quiz') ? 'quiz' : 'general';
    
    await memoryManager.addConversation(
      contextId,
      cleanMessage,
      response.data.response,
      subject,
      responseType,
      {
        state: context.state,
        model: model,
        hasContext: memoryInsights.insights.isFollowUp
      }
    );
    
    // Update session
    const topics = memoryManager.extractTopics(cleanMessage, subject);
    await memoryManager.updateSession(contextId, cleanMessage, topics);
    
    // Save updated context state
    conversationState[contextId] = context;
    
    return {
      success: true,
      response: response.data.response,
      memoryInsights: {
        hasAskedSimilar: memoryInsights.insights.hasAskedSimilar,
        suggestedTopics: memoryInsights.insights.suggestedNextTopics,
        progress: memoryInsights.progress
      }
    };
  } catch (error) {
    console.error('Error sending message to Ollama:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

function updateConversationState(context, message) {
  const msgLower = message.toLowerCase();
  
  if (context.state === 'initial') {
    if (msgLower.includes('brief')) {
      context.state = 'answered_brief';
    } else if (msgLower.includes('detailed')) {
      context.state = 'answered_detailed';
    }
  } else if (context.state.startsWith('answered')) {
    if (msgLower.includes('example') || msgLower.includes('step-by-step') || msgLower.includes('worked')) {
      context.state = 'show_examples';
    } else if (msgLower.includes('quiz') || msgLower.includes('mini quiz')) {
      context.state = 'quiz_start';
      context.currentQuestion = 1;
      context.totalQuestions = 3;
      context.userAnswers = [];
    } else if (msgLower.includes('practice') || msgLower.includes('problems')) {
      context.state = 'practice_problems';
    } else if (msgLower.includes('solutions') || msgLower.includes('show me the solutions')) {
      context.state = 'show_solutions';
    } else if (msgLower.includes('simpler terms') || msgLower.includes('simple')) {
      context.state = 'simple_explanation';
    } else if (msgLower.includes('new topic') || msgLower.includes('something else')) {
      context.state = 'new_question';
    } else if (msgLower.includes('explain') || msgLower.includes('specific')) {
      context.state = 'ask_specific';
    }
  } else if (context.state === 'quiz_start' || context.state === 'quiz_question') {
    // User provided an answer to a quiz question
    if (context.userAnswers) {
      context.userAnswers.push({
        question: context.currentQuestion,
        answer: message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (context.currentQuestion < context.totalQuestions) {
      context.currentQuestion++;
      context.state = 'quiz_question';
    } else {
      context.state = 'quiz_feedback';
    }
  } else if (context.state === 'quiz_feedback') {
    // After feedback, allow for follow-up actions
    if (msgLower.includes('quiz') || msgLower.includes('another') || msgLower.includes('take')) {
      context.state = 'quiz_start';
      context.currentQuestion = 1;
      context.userAnswers = [];
    }
  } else if (context.state === 'show_examples' || context.state === 'practice_problems') {
    // Handle transitions from other states to quiz
    if (msgLower.includes('quiz') || msgLower.includes('mini quiz')) {
      context.state = 'quiz_start';
      context.currentQuestion = 1;
      context.totalQuestions = 3;
      context.userAnswers = [];
    }
  }
}

// Enhanced prompt creation with memory context
async function createEnhancedPrompt(context, memoryInsights, currentQuestion) {
  const { originalQuestion, subject, state } = context;
  const { contextHistory, similarQuestions, progress, insights } = memoryInsights;

  const subjectContext = {
    chemistry: `You are an expert chemistry tutor for high school students (grades 9-12). Your tone is friendly, adaptive, and encouraging.`,
    math: `You are an expert mathematics tutor for high school students (grades 9-12). Your tone is friendly, adaptive, and encouraging.`,
    physics: `You are an expert physics tutor for high school students (grades 9-12). Your tone is friendly, adaptive, and encouraging.`
  };
  
  let basePrompt = `${subjectContext[subject]}\n\nSafety Guidelines:\n- ONLY answer questions related to chemistry, mathematics, and physics.\n- REFUSE to answer questions about weapons, explosives, drugs, violence, politics, adult content, or any harmful activities.\n- If asked about non-science topics, politely redirect to science.\n\nStudent's Current Question: \"${currentQuestion}\"`;

  // Add enhanced memory context
  let memoryPrompt = '\n\n## Detailed Student Context ##\n';

  if (insights.isFollowUp && contextHistory.length > 0) {
    const recentConvo = contextHistory.slice(-5).map(entry => 
      `- Previous Q: \"${entry.originalQuestion}\" (Style: ${entry.responseType})\n  - Your Answer: ${entry.answer.substring(0, 100)}...`
    ).join('\n');
    memoryPrompt += `\n**Recent Conversation Thread:**\n${recentConvo}`;
  }

  if (insights.hasAskedSimilar && similarQuestions.length > 0) {
    const similarConvo = similarQuestions.slice(0, 3).map(entry => 
      `- \"${entry.originalQuestion}\"`
    ).join('\n');
    memoryPrompt += `\n\n**Previously Asked Similar Questions:**\n${similarConvo}\n*Note: The student is revisiting these topics. Adapt your explanation.*`;
  }

  if (insights.previousMisconceptions.length > 0) {
    memoryPrompt += `\n\n**Potential Misconceptions to Address:**\n- Watched for topics like: ${insights.previousMisconceptions.join(', ')}`;
  }

  if (progress) {
    const totalQuestions = progress.totalQuestions;
    const topicsCovered = Object.keys(progress.topicsCovered).slice(0, 5).join(', ');
    memoryPrompt += `\n\n**Overall Learning Progress in ${subject}:**\n- Questions Asked: ${totalQuestions}\n- Topics Explored: ${topicsCovered}`;
  }

  memoryPrompt += `\n\n**Inferred Learning Style & State:**\n- Complexity of Current Question: ${insights.questionComplexity}\n- Typical Learning Pattern: ${insights.learningPattern}\n- Recommended Teaching Approach: **${insights.recommendedApproach}**`;

  if (insights.conceptualGaps.length > 0) {
    memoryPrompt += `\n- **Potential Conceptual Gaps Identified:** The student asked about \"${currentQuestion}\" but hasn't covered foundational topics like **${insights.conceptualGaps.join(', ')}**. It might be useful to touch on these.`;
  }

  let taskPrompt = '\n\n## Your Task ##\n';
  if (state === 'answered_brief') {
    taskPrompt += `Task: Provide a brief, 2-3 sentence answer.`;
  } else if (state === 'answered_detailed') {
    taskPrompt += `Task: Provide a detailed, comprehensive explanation with examples, keeping in mind the student's context.`;
  } else if (state === 'show_examples') {
    taskPrompt += `Task: Show step-by-step worked examples.`;
  } else if (state === 'practice_problems') {
    taskPrompt += `Task: Create 3-4 practice problems at ${insights.difficultyRecommendation} level.`;
  } else if (state.startsWith('quiz')) {
    // Dynamic quiz prompts...
  }

  return `${basePrompt}${memoryPrompt}\n\n${taskPrompt}\n\nAnswer:`;
}

function getFollowUpOptions(state, memoryInsights = null) {
  if (state === 'answered_brief') {
    return [
      { text: 'Get a detailed explanation', value: 'detailed' },
      { text: 'See step-by-step examples', value: 'examples' },
      { text: 'Try practice problems', value: 'practice' },
      { text: 'Take a mini quiz', value: 'quiz' },
      { text: 'Ask about specific parts', value: 'specific' }
    ];
  } else if (state === 'answered_detailed') {
    return [
      { text: 'Try practice problems', value: 'practice' },
      { text: 'Take a mini quiz', value: 'quiz' },
      { text: 'See more examples', value: 'examples' },
      { text: 'Ask about specific parts', value: 'specific' }
    ];
  } else if (state === 'show_examples') {
    return [
      { text: 'Try practice problems', value: 'practice' },
      { text: 'Take a mini quiz', value: 'quiz' },
      { text: 'Get simpler explanation', value: 'simple_explanation' },
      { text: 'Ask me something else', value: 'new_question' }
    ];
  } else if (state === 'practice_problems') {
    return [
      { text: 'Show me the solutions', value: 'show_solutions' },
      { text: 'Take a mini quiz', value: 'quiz' },
      { text: 'See more examples', value: 'examples' },
      { text: 'Ask about specific parts', value: 'specific' }
    ];
  } else if (state === 'quiz_start' || state === 'quiz_question') {
    // During quiz, don't show follow-up options - wait for answer
    return [];
  } else if (state === 'quiz_feedback') {
    return [
      { text: 'Take another quiz', value: 'quiz' },
      { text: 'Try practice problems', value: 'practice' },
      { text: 'Get detailed explanation', value: 'detailed' },
      { text: 'Ask me something else', value: 'new_question' }
    ];
  }
  return [];
}

function isQuestionAppropriate(message, subject) {
  const message_lower = message.toLowerCase();
  
  // Only block strictly harmful/inappropriate content
  const strictlyInappropriate = [
    'weapon', 'bomb', 'explosive', 'gun', 'knife', 'violence', 'kill', 'murder', 'suicide',
    'porn', 'sex', 'sexual', 'nude', 'naked', 'erotic', 'adult', 'xxx',
    'hack', 'hacking', 'illegal', 'cheat academic', 'fraud', 'scam', 'steal', 'piracy'
  ];
  
  // Check for strictly inappropriate content
  if (strictlyInappropriate.some(keyword => message_lower.includes(keyword))) {
    return false;
  }
  
  // Be very permissive for educational content - default to allowing questions
  // Only block if it's clearly not educational at all
  const clearlyNonEducational = [
    'celebrity gossip', 'fashion trends', 'movie reviews', 'sports scores',
    'cooking recipes', 'dating advice', 'investment tips', 'political opinions'
  ];
  
  // If it contains clearly non-educational phrases, block it
  if (clearlyNonEducational.some(phrase => message_lower.includes(phrase))) {
    return false;
  }
  
  // For the selected subject tabs, be even more permissive
  if (subject === 'chemistry' || subject === 'math' || subject === 'physics') {
    // Allow any question when a science subject is selected
    // The LLM will handle subject-specific filtering in its response
    return true;
  }
  
  // Default to allowing the question - let the LLM handle educational appropriateness
  return true;
}

function createPrompt(context) {
  const { originalQuestion, subject, state } = context;

  const subjectContext = {
    chemistry: `You are an expert chemistry tutor for high school students (grades 9-12). Your tone is friendly and encouraging.`,
    math: `You are an expert mathematics tutor for high school students (grades 9-12). Your tone is friendly and encouraging.`,
    physics: `You are an expert physics tutor for high school students (grades 9-12). Your tone is friendly and encouraging.`
  };
  
  const basePrompt = `${subjectContext[subject]}

Safety Guidelines:
- ONLY answer questions related to chemistry, mathematics, and physics.
- REFUSE to answer questions about weapons, explosives, drugs, violence, politics, adult content, or any harmful activities.
- If asked about non-science topics, politely redirect to science.

Student's Original Question: "${originalQuestion}"`;

  let taskPrompt = '';
  if (state === 'answered_brief') {
    taskPrompt = `Task: Provide a brief, 2-3 sentence answer to the student's question.`;
  } else if (state === 'answered_detailed') {
    taskPrompt = `Task: Provide a detailed, comprehensive explanation with examples.`;
  } else if (state === 'show_examples') {
    taskPrompt = `Task: Show step-by-step worked examples for the student's question.`;
  } else if (state === 'practice_problems') {
    taskPrompt = `Task: Create 3-4 practice problems related to the topic, with varying difficulty levels. Provide problems only, no solutions yet.`;
  } else if (state === 'quiz_start') {
    taskPrompt = `Task: Create ONE quiz question (Question ${context.currentQuestion} of ${context.totalQuestions}) about the topic. Make it multiple choice with 4 options (A, B, C, D). Only provide the question and options - do NOT give the answer or explanation yet. Wait for the student's response.`;
  } else if (state === 'quiz_question') {
    const previousAnswer = context.userAnswers[context.userAnswers.length - 1];
    taskPrompt = `Task: The student answered: "${previousAnswer.answer}". Now provide ONE new quiz question (Question ${context.currentQuestion} of ${context.totalQuestions}) about the topic. Make it multiple choice with 4 options (A, B, C, D). Only provide the question and options - do NOT give the answer or explanation yet.`;
  } else if (state === 'quiz_feedback') {
    const allAnswers = context.userAnswers.map((ans, idx) => `Q${idx+1}: ${ans.answer}`).join(', ');
    taskPrompt = `Task: The student completed the quiz with these answers: ${allAnswers}. Now provide feedback on their performance, explain the correct answers, and encourage their learning journey.`;
  } else if (state === 'ask_specific') {
    taskPrompt = `Task: The student has a specific follow-up question. Answer it concisely.`;
  }

  return `${basePrompt}

${taskPrompt}

Answer:`;
}

