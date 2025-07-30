const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class MemoryManager {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.historyFile = path.join(this.userDataPath, 'conversation_history.json');
        this.progressFile = path.join(this.userDataPath, 'learning_progress.json');
        this.sessionsFile = path.join(this.userDataPath, 'sessions.json');
        
        // In-memory cache for faster access
        this.conversationHistory = [];
        this.learningProgress = {};
        this.sessions = {};
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Load existing data
            await this.loadConversationHistory();
            await this.loadLearningProgress();
            await this.loadSessions();
            
            this.initialized = true;
            console.log('Memory Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Memory Manager:', error);
            // Initialize with empty data structures
            this.conversationHistory = [];
            this.learningProgress = {};
            this.sessions = {};
            this.initialized = true;
        }
    }

    async loadConversationHistory() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf8');
            this.conversationHistory = JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is corrupted, start with empty array
            this.conversationHistory = [];
        }
    }

    async loadLearningProgress() {
        try {
            const data = await fs.readFile(this.progressFile, 'utf8');
            this.learningProgress = JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is corrupted, start with empty object
            this.learningProgress = {};
        }
    }

    async loadSessions() {
        try {
            const data = await fs.readFile(this.sessionsFile, 'utf8');
            this.sessions = JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is corrupted, start with empty object
            this.sessions = {};
        }
    }

    async saveConversationHistory() {
        try {
            await fs.writeFile(this.historyFile, JSON.stringify(this.conversationHistory, null, 2));
        } catch (error) {
            console.error('Failed to save conversation history:', error);
        }
    }

    async saveLearningProgress() {
        try {
            await fs.writeFile(this.progressFile, JSON.stringify(this.learningProgress, null, 2));
        } catch (error) {
            console.error('Failed to save learning progress:', error);
        }
    }

    async saveSessions() {
        try {
            await fs.writeFile(this.sessionsFile, JSON.stringify(this.sessions, null, 2));
        } catch (error) {
            console.error('Failed to save sessions:', error);
        }
    }

    // Add a new conversation entry
    async addConversation(contextId, question, answer, subject, responseType, metadata = {}) {
        await this.initialize();
        
        const conversationEntry = {
            id: `${contextId}_${Date.now()}`,
            contextId,
            question: question.toLowerCase(),
            originalQuestion: question,
            answer,
            subject,
            responseType,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                topics: this.extractTopics(question, subject),
                difficulty: this.assessDifficulty(question),
                questionType: this.classifyQuestion(question)
            }
        };

        this.conversationHistory.push(conversationEntry);
        
        // Keep only last 1000 conversations to prevent excessive memory usage
        if (this.conversationHistory.length > 1000) {
            this.conversationHistory = this.conversationHistory.slice(-1000);
        }

        await this.saveConversationHistory();
        
        // Update learning progress
        await this.updateLearningProgress(subject, conversationEntry.metadata.topics, conversationEntry.metadata.difficulty);
        
        return conversationEntry;
    }

    // Get conversation history for a specific context
    getContextHistory(contextId, limit = 10) {
        return this.conversationHistory
            .filter(entry => entry.contextId === contextId)
            .slice(-limit);
    }

    // Find similar questions from history
    findSimilarQuestions(question, subject, limit = 5) {
        const questionLower = question.toLowerCase();
        const questionWords = questionLower.split(/\s+/).filter(word => word.length > 3);
        
        const similarities = this.conversationHistory
            .filter(entry => entry.subject === subject)
            .map(entry => {
                const entryWords = entry.question.split(/\s+/).filter(word => word.length > 3);
                const commonWords = questionWords.filter(word => entryWords.includes(word));
                const similarity = commonWords.length / Math.max(questionWords.length, entryWords.length);
                
                return {
                    ...entry,
                    similarity
                };
            })
            .filter(entry => entry.similarity > 0.2)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return similarities;
    }

    // Get recent questions by subject
    getRecentQuestionsBySubject(subject, limit = 10) {
        return this.conversationHistory
            .filter(entry => entry.subject === subject)
            .slice(-limit)
            .reverse();
    }

    // Update learning progress
    async updateLearningProgress(subject, topics, difficulty) {
        if (!this.learningProgress[subject]) {
            this.learningProgress[subject] = {
                totalQuestions: 0,
                topicsCovered: {},
                difficultyProgression: { easy: 0, medium: 0, hard: 0 },
                lastActivity: null,
                strengths: [],
                weaknesses: []
            };
        }

        const progress = this.learningProgress[subject];
        progress.totalQuestions++;
        progress.lastActivity = new Date().toISOString();
        progress.difficultyProgression[difficulty]++;

        // Update topics covered
        topics.forEach(topic => {
            if (!progress.topicsCovered[topic]) {
                progress.topicsCovered[topic] = { count: 0, lastAsked: null };
            }
            progress.topicsCovered[topic].count++;
            progress.topicsCovered[topic].lastAsked = new Date().toISOString();
        });

        await this.saveLearningProgress();
    }

    // Get learning progress for a subject
    getLearningProgress(subject) {
        return this.learningProgress[subject] || null;
    }

    // Create or update session
    async createSession(contextId, subject, initialQuestion) {
        await this.initialize();
        
        this.sessions[contextId] = {
            id: contextId,
            subject,
            startTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            initialQuestion,
            questionCount: 0,
            topicsCovered: [],
            state: 'active'
        };

        await this.saveSessions();
        return this.sessions[contextId];
    }

    // Update session activity
    async updateSession(contextId, question, topics = []) {
        if (this.sessions[contextId]) {
            this.sessions[contextId].lastActivity = new Date().toISOString();
            this.sessions[contextId].questionCount++;
            
            // Add new topics to session
            topics.forEach(topic => {
                if (!this.sessions[contextId].topicsCovered.includes(topic)) {
                    this.sessions[contextId].topicsCovered.push(topic);
                }
            });

            await this.saveSessions();
        }
    }

    // Generate context-aware insights with enhanced details
    generateContextInsights(contextId, currentQuestion, subject) {
        const contextHistory = this.getContextHistory(contextId, 10);
        const similarQuestions = this.findSimilarQuestions(currentQuestion, subject, 8);
        const progress = this.getLearningProgress(subject);
        const allSubjectHistory = this.getRecentQuestionsBySubject(subject, 20);
        const currentTopics = this.extractTopics(currentQuestion, subject);
        
        // Enhanced insights with more detailed analysis
        const insights = {
            isFollowUp: contextHistory.length > 0,
            hasAskedSimilar: similarQuestions.length > 0,
            suggestedNextTopics: this.getSuggestedNextTopics(subject, progress),
            difficultyRecommendation: this.recommendDifficulty(progress),
            
            // NEW: Enhanced context details
            questionComplexity: this.analyzeQuestionComplexity(currentQuestion),
            learningPattern: this.analyzeLearningPattern(allSubjectHistory, subject),
            conceptualGaps: this.identifyConceptualGaps(currentTopics, progress, subject),
            previousMisconceptions: this.identifyPreviousMisconceptions(similarQuestions),
            recommendedApproach: this.recommendTeachingApproach(currentQuestion, progress, contextHistory)
        };
        
        return {
            contextHistory,
            similarQuestions,
            progress,
            allSubjectHistory,
            currentTopics,
            insights
        };
    }

    // Extract topics from question
    extractTopics(question, subject) {
        const questionLower = question.toLowerCase();
        const topics = [];

        const topicKeywords = {
            chemistry: {
                'atomic structure': ['atom', 'electron', 'proton', 'neutron', 'nucleus', 'orbital', 'shell'],
                'periodic table': ['periodic', 'element', 'group', 'period', 'metal', 'nonmetal', 'halogen'],
                'chemical bonding': ['bond', 'ionic', 'covalent', 'molecular', 'valence', 'electronegativity'],
                'acids and bases': ['acid', 'base', 'ph', 'acidic', 'basic', 'alkaline', 'neutralization'],
                'organic chemistry': ['organic', 'carbon', 'hydrocarbon', 'polymer', 'alcohol', 'ester', 'benzene']
            },
            math: {
                'algebra': ['equation', 'variable', 'solve', 'linear', 'quadratic', 'polynomial'],
                'geometry': ['triangle', 'circle', 'area', 'volume', 'angle', 'theorem', 'proof'],
                'trigonometry': ['sine', 'cosine', 'tangent', 'trigonometric', 'angle', 'triangle'],
                'calculus': ['derivative', 'integral', 'limit', 'differentiation', 'integration', 'function'],
                'statistics': ['mean', 'median', 'mode', 'probability', 'distribution', 'standard deviation']
            },
            physics: {
                'mechanics': ['force', 'motion', 'velocity', 'acceleration', 'momentum', 'energy', 'work'],
                'thermodynamics': ['heat', 'temperature', 'entropy', 'thermal', 'gas', 'pressure'],
                'electricity': ['current', 'voltage', 'resistance', 'circuit', 'power', 'charge'],
                'optics': ['light', 'reflection', 'refraction', 'lens', 'mirror', 'spectrum'],
                'waves': ['wave', 'frequency', 'amplitude', 'wavelength', 'sound', 'vibration']
            }
        };

        if (topicKeywords[subject]) {
            Object.entries(topicKeywords[subject]).forEach(([topic, keywords]) => {
                if (keywords.some(keyword => questionLower.includes(keyword))) {
                    topics.push(topic);
                }
            });
        }

        return topics.length > 0 ? topics : ['general'];
    }

    // Assess question difficulty
    assessDifficulty(question) {
        const questionLower = question.toLowerCase();
        
        const easyIndicators = ['what is', 'define', 'simple', 'basic', 'example'];
        const hardIndicators = ['derive', 'prove', 'analyze', 'complex', 'advanced', 'mechanism', 'calculate'];
        
        const easyCount = easyIndicators.filter(indicator => questionLower.includes(indicator)).length;
        const hardCount = hardIndicators.filter(indicator => questionLower.includes(indicator)).length;
        
        if (hardCount > easyCount) return 'hard';
        if (easyCount > 0) return 'easy';
        return 'medium';
    }

    // Classify question type
    classifyQuestion(question) {
        const questionLower = question.toLowerCase();
        
        if (questionLower.includes('what') || questionLower.includes('define')) return 'definition';
        if (questionLower.includes('how') || questionLower.includes('step')) return 'process';
        if (questionLower.includes('why') || questionLower.includes('explain')) return 'explanation';
        if (questionLower.includes('calculate') || questionLower.includes('solve')) return 'problem';
        if (questionLower.includes('compare') || questionLower.includes('difference')) return 'comparison';
        
        return 'general';
    }

    // Get suggested next topics
    getSuggestedNextTopics(subject, progress) {
        if (!progress) return [];
        
        const allTopics = {
            chemistry: ['atomic structure', 'periodic table', 'chemical bonding', 'acids and bases', 'organic chemistry'],
            math: ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics'],
            physics: ['mechanics', 'thermodynamics', 'electricity', 'optics', 'waves']
        };

        const coveredTopics = Object.keys(progress.topicsCovered || {});
        const uncoveredTopics = (allTopics[subject] || []).filter(topic => !coveredTopics.includes(topic));
        
        return uncoveredTopics.slice(0, 3);
    }

    // Recommend difficulty level
    recommendDifficulty(progress) {
        if (!progress) return 'easy';
        
        const { easy, medium, hard } = progress.difficultyProgression;
        const total = easy + medium + hard;
        
        if (total < 5) return 'easy';
        if (hard / total > 0.6) return 'hard';
        if (medium / total > 0.4) return 'medium';
        return 'easy';
    }

    // NEW: Analyze question complexity
    analyzeQuestionComplexity(question) {
        const qLower = question.toLowerCase();
        let score = 0;

        if (qLower.includes('why') || qLower.includes('how')) score++;
        if (qLower.includes('compare') || qLower.includes('contrast')) score += 2;
        if (qLower.includes('analyze') || qLower.includes('derive')) score += 3;
        if (qLower.split(' ').length > 15) score++;

        if (score >= 3) return 'high';
        if (score >= 1) return 'medium';
        return 'low';
    }

    // NEW: Analyze learning patterns from history
    analyzeLearningPattern(history, subject) {
        if (!history || history.length < 5) return 'new_learner';

        const topicFrequency = {};
        history.forEach(entry => {
            const topics = this.extractTopics(entry.originalQuestion, subject);
            topics.forEach(topic => {
                topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
            });
        });

        const sortedTopics = Object.keys(topicFrequency).sort((a, b) => topicFrequency[b] - topicFrequency[a]);
        if (sortedTopics.length > 0 && topicFrequency[sortedTopics[0]] > history.length * 0.5) {
            return `focused_on_${sortedTopics[0].replace(' ', '_')}`;
        }

        return 'diverse_explorer';
    }

    // NEW: Identify potential conceptual gaps
    identifyConceptualGaps(currentTopics, progress, subject) {
        if (!progress || !progress.topicsCovered) return [];

        const gaps = [];
        const coveredTopics = Object.keys(progress.topicsCovered);

        const topicDependencies = {
            chemistry: {
                'chemical bonding': ['atomic structure'],
                'acids and bases': ['chemical bonding'],
                'organic chemistry': ['chemical bonding']
            },
            math: {
                'calculus': ['algebra', 'trigonometry'],
                'trigonometry': ['geometry']
            },
            physics: {
                'thermodynamics': ['mechanics'],
                'electricity': ['mechanics']
            }
        };

        currentTopics.forEach(topic => {
            const dependencies = topicDependencies[subject]?.[topic] || [];
            dependencies.forEach(dep => {
                if (!coveredTopics.includes(dep)) {
                    gaps.push(dep);
                }
            });
        });

        return [...new Set(gaps)];
    }

    // NEW: Identify previous misconceptions from similar questions
    identifyPreviousMisconceptions(similarQuestions) {
        const misconceptions = [];
        similarQuestions.forEach(q => {
            if (q.metadata?.feedback?.includes('misconception') || q.answer.toLowerCase().includes('not quite')) {
                misconceptions.push(q.originalQuestion);
            }
        });
        return misconceptions;
    }

    // NEW: Recommend a teaching approach based on context
    recommendTeachingApproach(question, progress, history) {
        const complexity = this.analyzeQuestionComplexity(question);
        if (complexity === 'high') return 'in_depth_conceptual';
        if (this.classifyQuestion(question) === 'problem') return 'problem_solving_walkthrough';
        if (history.length === 0) return 'foundational_first';
        return 'socratic_guidance';
    }

    // Clean up old data (call periodically)
    async cleanup(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        // Remove old conversations
        this.conversationHistory = this.conversationHistory.filter(
            entry => new Date(entry.timestamp) > cutoffDate
        );
        
        // Remove old sessions
        Object.keys(this.sessions).forEach(sessionId => {
            if (new Date(this.sessions[sessionId].lastActivity) < cutoffDate) {
                delete this.sessions[sessionId];
            }
        });

        await this.saveConversationHistory();
        await this.saveSessions();
    }
}

module.exports = MemoryManager;
