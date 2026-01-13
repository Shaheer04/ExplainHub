# ⚡ ExplainHub

> **Understand any codebase in seconds.**

ExplainHub is an advanced AI-powered code analysis tool designed to help developers instantly understand complex repositories. By combining the reasoning capabilities of **Google Gemini 2.0** with static code analysis and interactive visualizations, ExplainHub transforms raw code into clear, actionable insights.

![ExplainHub Demo](assets/preview.png)

## ✨ Key Features

- **🤖 AI-Powered Explanations**: Get instant, human-readable explanations for any file, directory, or function using Gemini 2.0 Flash.
- **🏛️ Architecture Diagrams**: Automatically generate detailed architecture diagrams (Mermaid.js) showing relationships, dependencies, and functional blocks.
- **🔍 Static Code Analysis**: Hybrid analysis engine combining AI reasoning with deterministic static analysis for accurate dependency tracking.
- **🌲 Interactive File Explorer**: Navigate repositories with a familiar tree view that integrates explanation pointers.
- **💬 Contextual Chat**: Ask questions about specific files or code blocks and get context-aware answers.
- **⚡ Smart Caching**: Efficient caching system to minimize API calls and speed up repeated analyses.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Engine**: Google Gemini API (Gemini 2.0 Flash / Pro)
- **Visualization**: Mermaid.js for architecture diagrams
- **Analysis**: Custom static analysis engine + AST parsing
- **State Management**: React Context API
- **Styling**: Glassmorphism UI with Tailwind

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (Free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shaheer04/Codebase-Explainer.git
   cd Codebase-Explainer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📖 Usage

1. **Enter API Key**: On the home screen, enter your Gemini API Key. It is stored locally in your browser session.
2. **Analyze a Repo**: Paste a GitHub repository URL (e.g., `facebook/react`) and click **Analyze Code**.
3. **Explore**:
   - Click files in the sidebar to read explanations.
   - Use the **Architecture** tab to view the generated system diagram.
   - Use the **Chat** feature to ask specific questions about the code.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">
  Built with ❤️ by Shaheer
</p>
