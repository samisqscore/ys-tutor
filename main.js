const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;
// In-memory store for conversation state
const conversationState = {};

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

ipcMain.handle('send-message', async (event, { model, message, subject, contextId }) => {
  try {
    const cleanMessage = message.replace(/^internal check: /, '');
    
    if (!isQuestionAppropriate(cleanMessage, subject)) {
      return {
        success: false,
        error: 'inappropriate_content',
        message: "Sorry, I've been trained to answer only science-related questions (Chemistry, Physics, and Mathematics) and cannot respond to other topics or topics with sensitive questions. Please ask me about general science concepts instead!"
      };
    }

    // Get or create conversation context
    const context = conversationState[contextId] || {
      originalQuestion: cleanMessage,
      subject: subject,
      state: 'initial'
    };
    
    // Update state based on message
    updateConversationState(context, cleanMessage);
    
    // If it's the first message, ask for response type
    if (context.state === 'initial') {
      conversationState[contextId] = context; // Save state
      return {
        success: true,
        response: 'How would you like me to respond?',
        followUp: true,
        options: [
          { text: 'Brief answer', value: 'brief' },
          { text: 'Detailed explanation', value: 'detailed' }
        ]
      };
    }

    const prompt = createPrompt(context);
    
    if (prompt === null) {
      return {
        success: false,
        error: 'inappropriate_content',
        message: "Sorry, I've been trained to answer only science-related questions (Chemistry, Physics, and Mathematics) and cannot respond to other topics or topics with sensitive questions. Please ask me about general science concepts instead!"
      };
    }
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false
    });
    
    const followUpOptions = getFollowUpOptions(context.state);
    
    // Save updated context state
    conversationState[contextId] = context;
    
    return {
      success: true,
      response: response.data.response,
      followUp: true,
      options: followUpOptions
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

function getFollowUpOptions(state) {
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
      { text: 'Get solutions to problems', value: 'show solutions' },
      { text: 'Take a mini quiz', value: 'quiz' },
      { text: 'See more examples', value: 'examples' },
      { text: 'Ask about specific parts', value: 'specific' }
    ];
  } else if (state === 'quiz_start' || state === 'quiz_question') {
    // During quiz, don't show follow-up options - wait for answer
    return [];
  } else if (state === 'quiz_feedback') {
    return [
      { text: 'Take another quiz', value: 'Take a mini quiz' },
      { text: 'Try practice problems', value: 'practice' },
      { text: 'Get detailed explanation', value: 'detailed' },
      { text: 'Ask me something else', value: 'new_question' }
    ];
  }
  return [];
}

function isQuestionAppropriate(message, subject) {
  const inappropriateKeywords = [
    'weapon', 'bomb', 'explosive', 'gun', 'knife', 'violence', 'kill', 'murder', 'suicide',
    'drug', 'narcotic', 'cocaine', 'heroin', 'marijuana', 'cannabis', 'addiction',
    'politics', 'political', 'government', 'president', 'minister', 'election', 'vote',
    'democracy', 'dictatorship', 'communist', 'capitalist', 'socialist',
    'porn', 'sex', 'sexual', 'nude', 'naked', 'erotic', 'adult', 'xxx',
    'hack', 'hacking', 'illegal', 'cheat', 'fraud', 'scam', 'steal', 'piracy',
    'history', 'geography', 'literature', 'poetry', 'music', 'art', 'painting',
    'cooking', 'recipe', 'food', 'sports', 'game', 'movie', 'film', 'celebrity',
    'fashion', 'clothing', 'shopping', 'business', 'finance', 'money', 'investment'
  ];

  const message_lower = message.toLowerCase();
  
  if (inappropriateKeywords.some(keyword => message_lower.includes(keyword))) {
    return false;
  }

  const scienceKeywords = {
    chemistry: ['atom', 'molecule', 'element', 'compound', 'reaction', 'acid', 'base', 'salt', 'organic', 'inorganic', 'periodic', 'bond', 'valence', 'electron', 'proton', 'neutron', 'ion', 'catalyst', 'solution', 'mixture', 'chemical', 'formula', 'equation', 'oxidation', 'reduction', 'ph', 'mole', 'molarity', 'carbon', 'hydrogen', 'oxygen', 'nitrogen', 'halogen', 'metal', 'nonmetal'],
    math: ['equation', 'algebra', 'geometry', 'trigonometry', 'calculus', 'derivative', 'integral', 'function', 'graph', 'coordinate', 'triangle', 'circle', 'square', 'rectangle', 'polynomial', 'quadratic', 'linear', 'logarithm', 'exponential', 'probability', 'statistics', 'matrix', 'vector', 'angle', 'sine', 'cosine', 'tangent', 'theorem', 'proof', 'solve', 'calculate', 'number', 'prime', 'fraction', 'decimal', 'percentage', 'ratio', 'proportion'],
    physics: ['force', 'motion', 'velocity', 'acceleration', 'mass', 'energy', 'power', 'work', 'momentum', 'friction', 'gravity', 'pressure', 'temperature', 'heat', 'light', 'sound', 'wave', 'frequency', 'amplitude', 'electricity', 'current', 'voltage', 'resistance', 'circuit', 'magnetism', 'optics', 'lens', 'mirror', 'refraction', 'reflection', 'thermodynamics', 'mechanics', 'kinematics', 'dynamics', 'nuclear', 'radioactive', 'photon', 'electron']
  };

  const allScienceKeywords = [...scienceKeywords.chemistry, ...scienceKeywords.math, ...scienceKeywords.physics];
  if (allScienceKeywords.some(keyword => message_lower.includes(keyword))) {
    return true;
  }

  const academicTerms = ['explain', 'what is', 'how to', 'solve', 'calculate', 'find', 'determine', 'prove', 'derive', 'show', 'demonstrate', 'example', 'formula', 'method', 'step', 'problem', 'question', 'answer', 'cbse', 'grade', 'class', 'chapter', 'unit', 'topic'];
  if (academicTerms.some(term => message_lower.includes(term))) {
    return true;
  }

  const followUpPhrases = [
    'yes', 'yes please', 'sure', 'ok', 'okay', 'go ahead', 'continue', 'more', 
    'deeper', 'detail', 'details', 'further', 'quiz', 'test', 'check', 'understanding',
    'practice', 'examples', 'help', 'specific', 'parts', 'overall', 'concept',
    'step by step', 'worked examples', 'simpler', 'simple', 'harder', 'difficult',
    'i want', 'i would like', 'can you', 'please', 'tell me', 'show me',
    'a', 'b', 'c', 'd', '1', '2', '3', '4',
    'option', 'choice', 'answer is', 'my answer', 'i think', 'i choose'
  ];
  
  if (followUpPhrases.some(phrase => message_lower.includes(phrase))) {
    return true;
  }

  return message.trim().length <= 20;
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

