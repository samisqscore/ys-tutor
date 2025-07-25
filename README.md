# 🧪 Young-Scientist.in Chemistry Tutor App

![Young-Scientist.in Logo](assets/ys_logo(2).png)

A comprehensive **AI-powered desktop tutoring application** for high school students (grades 9-12) specializing in **Chemistry**, **Mathematics**, and **Physics**. Built with Electron and powered by Ollama's Gemma AI models.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Testing Guidelines](#testing-guidelines)
- [Known Issues & Bugs](#known-issues--bugs)
- [Contributing](#contributing)
- [Development Setup](#development-setup)
- [Build & Distribution](#build--distribution)
- [License](#license)

## 🎯 Overview

Young-Scientist.in is an educational desktop application designed to provide personalized tutoring for high school science subjects. The application uses advanced AI conversation flows to adapt to student learning needs through various interaction modes including brief explanations, detailed tutorials, practice problems, and interactive quizzes.

### 🌟 Key Highlights

- **AI-Powered Learning**: Integration with Ollama Gemma models for intelligent tutoring
- **Multi-Subject Support**: Chemistry, Mathematics, and Physics
- **Adaptive Learning Flow**: Brief/detailed explanations, examples, practice, and quizzes
- **Safe Learning Environment**: Built-in content filtering for educational focus
- **Cross-Platform**: Available for macOS, Windows, and Linux
- **Interactive UI**: Modern, student-friendly interface with smooth animations

## ✨ Features

### 🎓 Educational Features
- **Subject-Specific Tutoring**: Dedicated modules for Chemistry, Math, and Physics
- **Quick Topic Access**: One-click access to common topics in each subject
- **Adaptive Response Types**: Choose between brief answers or detailed explanations
- **Step-by-Step Examples**: Worked examples with clear explanations
- **Practice Problems**: Generated practice questions with varying difficulty
- **Interactive Quizzes**: Multi-question quizzes with immediate feedback
- **Context-Aware Conversations**: Maintains conversation history and context

### 🛡️ Safety Features
- **Content Filtering**: Automatically blocks inappropriate or non-educational content
- **Educational Focus**: Redirects off-topic questions back to science subjects
- **Safe AI Interactions**: Prevents harmful or dangerous content generation

### 💻 Technical Features
- **Offline Capable**: Works with locally installed Ollama models
- **Real-time Model Selection**: Dynamic loading of available Gemma models
- **Cross-Platform Desktop App**: Built with Electron for universal compatibility
- **Modern UI/UX**: Responsive design with gradient themes and smooth animations

## 🔧 Prerequisites

### System Requirements
- **Operating System**: macOS 10.13+, Windows 10+, or Linux (Ubuntu 18.04+)
- **Memory**: 4GB RAM minimum, 8GB+ recommended
- **Storage**: 2GB free space (plus model storage)
- **Network**: Internet connection for initial setup

### Required Software
1. **Node.js** (v16 or higher)
   ```bash
   # Download from https://nodejs.org/
   node --version  # Should show v16+
   ```

2. **Ollama** (Latest version)
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai/download
   ```

3. **Gemma Models** (At least one required)
   ```bash
   # Install a Gemma model (choose based on your system capabilities)
   ollama pull gemma:2b     # Lightweight (2B parameters)
   ollama pull gemma:7b     # Full-featured (7B parameters)
   ```

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ys-tutor.git
cd chemistry-tutor-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify Ollama Setup
```bash
# Check if Ollama is running
ollama list

# Start Ollama service if needed
ollama serve
```

### 4. Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📖 Usage

### Getting Started
1. **Launch the app** using `npm start`
2. **Select a Gemma model** from the dropdown (top-right)
3. **Choose a subject** (Chemistry, Math, or Physics)
4. **Ask a question** or click a quick topic button
5. **Select response type** (Brief or Detailed)
6. **Use follow-up options** for deeper learning

### Learning Flow Examples

#### Basic Question Flow
```
Student: "What is photosynthesis?"
→ App: "How would you like me to respond?"
→ Student: Clicks "Detailed explanation"
→ App: Provides comprehensive explanation
→ Follow-up options: [Practice Problems] [Quiz] [Examples]
```

#### Quiz Interaction
```
Student: Clicks "Take a mini quiz"
→ App: Presents Question 1 of 3
→ Student: Answers "B"
→ App: Presents Question 2 of 3
→ Student: Answers "A"
→ App: Presents Question 3 of 3
→ Student: Answers "C"
→ App: Provides feedback on all answers
```

## 🏗️ Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Electron
- **AI Integration**: Ollama API (Gemma models)
- **HTTP Client**: Axios
- **Build Tools**: Electron Builder

### File Structure
```
chemistry-tutor-app/
├── main.js              # Electron main process
├── renderer.js          # Frontend JavaScript
├── preload.js          # Electron preload script
├── index.html          # Main UI
├── styles.css          # Application styling
├── package.json        # Project configuration
├── assets/             # Images and icons
│   ├── icons/         # App icons for different platforms
│   └── ys_logo(2).png # Main logo
└── dist/              # Built distributables
```

### Core Components

#### 1. Main Process (`main.js`)
- **Window Management**: Creates and manages the main application window
- **IPC Handlers**: Manages communication between frontend and backend
- **AI Integration**: Handles Ollama API calls and response processing
- **State Management**: Maintains conversation context and learning flow
- **Content Filtering**: Ensures educational content safety

#### 2. Renderer Process (`renderer.js`)
- **UI Management**: Handles user interactions and interface updates
- **Model Loading**: Dynamically loads available Gemma models
- **Message Handling**: Processes user input and AI responses
- **Follow-up Options**: Manages interactive learning buttons

#### 3. Conversation Flow Engine
- **State Tracking**: Monitors learning progress and context
- **Response Adaptation**: Adjusts AI prompts based on student needs
- **Quiz Management**: Handles multi-question quiz sessions
- **Practice Problems**: Generates and manages practice exercises

## 🧪 Testing Guidelines

### ⚠️ **CRITICAL TESTING NEEDED**

Contributors must thoroughly test the following areas before submitting PRs:

### 1. Core Functionality Testing

#### Model Integration
- [ ] **Gemma Model Loading**: Verify only Gemma models appear in dropdown
- [ ] **Model Switching**: Test switching between different Gemma models mid-conversation
- [ ] **API Connectivity**: Test behavior when Ollama is offline/unavailable
- [ ] **Error Handling**: Verify graceful handling of API timeouts and errors

#### Subject Switching
- [ ] **Context Reset**: Ensure conversation context clears when switching subjects
- [ ] **Topic Button Updates**: Verify correct topic buttons appear for each subject
- [ ] **State Persistence**: Test that subject-specific context is maintained

### 2. Learning Flow Testing

#### Basic Conversation
- [ ] **Initial Response Options**: Test brief vs. detailed response selection
- [ ] **Follow-up Buttons**: Verify all follow-up options work correctly
- [ ] **Context Continuity**: Ensure conversation maintains context throughout

#### Quiz System ⚠️ **HIGH PRIORITY**
- [ ] **Quiz Initiation**: Test quiz starts correctly from different states
- [ ] **Question Progression**: Verify 1→2→3 question flow works properly  
- [ ] **Answer Collection**: Ensure student answers are captured correctly
- [ ] **Feedback Generation**: Test final feedback includes all answers
- [ ] **Quiz Restart**: **KNOWN BUG** - Test taking multiple quizzes in succession
- [ ] **State Reset**: Verify quiz state resets properly between attempts

#### Practice Problems
- [ ] **Problem Generation**: Test practice problem creation for all subjects
- [ ] **Solution Flow**: Verify solution reveal functionality
- [ ] **Difficulty Progression**: Test varying difficulty levels

### 3. UI/UX Testing

#### Interface Elements
- [ ] **Button Styling**: Verify follow-up buttons match existing design
- [ ] **Responsive Design**: Test on different screen sizes
- [ ] **Loading States**: Verify loading animations during AI processing
- [ ] **Error Messages**: Test error message display and styling

#### Accessibility
- [ ] **Keyboard Navigation**: Test tab navigation through interface
- [ ] **Screen Reader**: Verify screen reader compatibility
- [ ] **Color Contrast**: Ensure adequate contrast ratios

### 4. Content Safety Testing

#### Content Filtering
- [ ] **Inappropriate Keywords**: Test blocked keyword detection
- [ ] **Educational Redirect**: Verify off-topic questions are redirected
- [ ] **Subject Boundaries**: Test cross-subject question handling
- [ ] **Safety Messages**: Verify appropriate safety messages display

### 5. Performance Testing

#### Resource Usage
- [ ] **Memory Consumption**: Monitor RAM usage during extended sessions
- [ ] **Response Times**: Test AI response speed with different models
- [ ] **Concurrent Operations**: Test multiple rapid interactions

#### Stability
- [ ] **Extended Sessions**: Test app stability over long usage periods
- [ ] **Memory Leaks**: Monitor for memory leaks during quiz/practice sessions
- [ ] **Model Loading**: Test switching models under load

### 6. Cross-Platform Testing

#### Operating Systems
- [ ] **macOS**: Test on multiple macOS versions (10.13+)
- [ ] **Windows**: Test on Windows 10 and 11
- [ ] **Linux**: Test on Ubuntu 18.04+ and other distributions

## 🐛 Known Issues & Bugs

### 🔴 Critical Issues

#### Quiz System Bug
**Issue**: Quiz doesn't reset properly when taking multiple quizzes
- **Symptoms**: Second quiz attempt shows results from first quiz
- **Impact**: Prevents effective learning assessment
- **Workaround**: Refresh app or switch subjects between quizzes
- **Status**: Fix attempted in latest commit, needs testing
- **Priority**: HIGH

### 🟡 Medium Priority Issues

#### Model Selection
**Issue**: Model dropdown may not update immediately after installing new Gemma models
- **Symptoms**: New models don't appear until app restart
- **Workaround**: Restart application after installing new models
- **Priority**: MEDIUM

#### Context Persistence
**Issue**: Long conversations may lose early context
- **Symptoms**: AI may not remember initial questions in extended sessions
- **Impact**: Reduced learning continuity
- **Priority**: MEDIUM

### 🟢 Low Priority Issues

#### UI Polish
- Loading spinner could be more prominent
- Some button hover animations could be smoother
- Mobile responsiveness needs improvement (though desktop-focused)

### 🔍 Issues That Need Investigation

1. **Memory Usage**: App memory consumption during extended use
2. **Model Performance**: Response quality differences between Gemma variants
3. **Conversation Length**: Optimal conversation length before context reset
4. **Concurrent Requests**: Handling multiple rapid AI requests

## 🤝 Contributing

We welcome contributions from educators, developers, and students! 

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Run the testing checklist** (see Testing Guidelines above)
4. **Document any bugs found** in your PR description
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Contribution Guidelines

#### Before Contributing
- [ ] Read and understand the codebase architecture
- [ ] Set up the development environment completely
- [ ] Run through the testing checklist
- [ ] Check existing issues to avoid duplicates

#### Pull Request Requirements
- [ ] **Testing Evidence**: Include screenshots/videos of testing
- [ ] **Bug Reports**: Document any bugs discovered during testing
- [ ] **Code Comments**: Add comments for complex logic
- [ ] **Documentation Updates**: Update README if needed

#### Areas Needing Help

**High Priority**
- [ ] Fix quiz restart bug
- [ ] Improve error handling for Ollama connectivity
- [ ] Add unit tests for conversation flow

**Medium Priority**  
- [ ] Add more subject-specific topics
- [ ] Improve AI prompt engineering
- [ ] Add conversation export functionality

**Low Priority**
- [ ] Mobile/tablet interface adaptation
- [ ] Dark mode theme
- [ ] Multiple language support

## 💻 Development Setup

### Environment Setup
```bash
# Clone and install
git clone https://github.com/yourusername/chemistry-tutor-app.git
cd chemistry-tutor-app
npm install

# Set up development environment
export NODE_ENV=development

# Run in development mode (with DevTools)
npm run dev
```

### Development Scripts
```bash
npm start          # Production mode
npm run dev        # Development mode with DevTools
npm run build      # Build for current platform
npm run build:mac  # Build for macOS
npm run build:win  # Build for Windows
npm run build:linux # Build for Linux
npm run build:all  # Build for all platforms
```

### Debugging
- **DevTools**: Automatically opens in development mode
- **Console Logs**: Check both main process and renderer console
- **Network Tab**: Monitor Ollama API calls
- **Application Tab**: Inspect local storage and session data

## 📦 Build & Distribution

### Building Installers
```bash
# Build for your current platform
npm run build

# Build for specific platforms
npm run build:mac     # Creates .dmg and .zip
npm run build:win     # Creates .exe installer and portable
npm run build:linux  # Creates .AppImage, .deb, and .rpm

# Build for all platforms (requires appropriate signing certificates)
npm run build:all
```

### Distribution Files
After building, check the `dist/` folder for:
- **macOS**: `.dmg` installer and `.zip` archive
- **Windows**: `.exe` installer and portable version
- **Linux**: `.AppImage`, `.deb`, and `.rpm` packages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team** for the excellent local AI inference platform
- **Google** for the Gemma model family
- **Electron Team** for the cross-platform framework
- **Young-Scientist.in** community for educational guidance and testing

## 📞 Support

- **Issues**: Please use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: [your-email@domain.com] for direct support

---

**Made with ❤️ for students and educators worldwide**

*Young-Scientist.in - Empowering the next generation of scientists*
