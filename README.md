# Justice Companion - Free Legal Aid Assistant

![Justice Companion](https://img.shields.io/badge/Legal_Aid-Free-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Platform](https://img.shields.io/badge/Platform-Electron-lightgrey)
![React](https://img.shields.io/badge/React-18-61dafb)

## 🚨 IMPORTANT LEGAL DISCLAIMER

**Justice Companion provides legal information, NOT legal advice.** This application is designed to help users understand legal concepts and navigate legal processes, but it cannot replace a qualified attorney. For specific legal matters, always consult with a licensed legal professional.

## 🎯 Mission

Justice Companion is a free legal aid application built to help those who cannot afford traditional legal representation. Inspired by real experiences with the justice system, this tool aims to democratize access to legal information and support.

## ✨ Features

### 💬 AI-Powered Legal Assistant
- Natural language chat interface
- Context-aware legal information
- Case law references and explanations
- Document drafting assistance

### 📁 Case Management
- Organize multiple legal matters
- Track important dates and deadlines
- Store documents securely
- Timeline visualization of case events

### 🔒 Security & Privacy
- End-to-end encryption for all data
- Hardware-derived encryption keys
- GDPR compliant
- Complete audit trail
- No data leaves your device without permission

### 🎨 User Experience
- Clean, ChatGPT-style interface
- Accessibility-first design
- Keyboard navigation support
- Mobile-responsive layout

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Ollama (for AI features) - [Download here](https://ollama.com)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/justice-companion.git
cd justice-companion
```

2. Install dependencies
```bash
cd justice-companion-app
npm install
```

3. Set up Ollama (for AI features)
```bash
# Install Ollama from https://ollama.com
# Pull the legal assistant model
ollama pull llama2
```

4. Run the application
```bash
npm start
```

## 🖥️ Development

### Tech Stack
- **Frontend:** React 18, Vite
- **Desktop:** Electron
- **Database:** SQLite with encryption
- **AI:** Ollama integration
- **Security:** AES-256-GCM encryption

### Available Scripts

```bash
npm start          # Run Electron app
npm run dev        # Development mode with hot reload
npm run build      # Build for production
npm test           # Run tests
npm run dist       # Package for distribution
```

### Project Structure
```
justice-companion-app/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React application
│   │   ├── components/ # UI components
│   │   └── lib/       # Utilities
│   ├── api/           # API integrations
│   ├── database/      # Database layer
│   └── security/      # Encryption/security
├── public/            # Static assets
└── dist/             # Build output
```

## 🤝 Contributing

We welcome contributions! Justice Companion is open source because legal aid should be accessible to everyone.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Areas We Need Help

- 🌍 **Translations** - Help make this accessible in more languages
- 📚 **Legal Templates** - Contribute jurisdiction-specific templates
- 🐛 **Bug Reports** - Help us improve stability
- ✨ **Feature Ideas** - Suggest improvements
- 📖 **Documentation** - Improve guides and tutorials

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with pain, powered by hope
- Inspired by those failed by the system
- Dedicated to equal access to justice

## 🔗 Links

- [Report Issues](https://github.com/yourusername/justice-companion/issues)
- [Documentation Wiki](https://github.com/yourusername/justice-companion/wiki)
- [Discussions](https://github.com/yourusername/justice-companion/discussions)

## 📊 Project Status

- ✅ Core chat interface
- ✅ Case management system
- ✅ Encryption implementation
- ✅ Ollama AI integration
- 🚧 Legal document templates
- 🚧 Multi-language support
- 📋 Planned: Court deadline calculator
- 📋 Planned: Legal form autofill

---

**Remember:** This tool provides information, not legal advice. When in doubt, consult a qualified attorney.

*Built with ❤️ for those who need it most*