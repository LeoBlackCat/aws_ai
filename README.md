# AI Assessment Trainer

An AI-powered educational assessment trainer that helps users learn to answer questions using specific phrasing from educational content. The application uses OpenAI's API to evaluate user responses against predefined answers from markdown files.

## Features

- **Interactive Q&A**: Practice answering questions with AI-powered evaluation
- **Voice Integration**: Speech recognition and text-to-speech capabilities
- **Dual Modes**: Training mode with hints and Assessment mode with formal scoring
- **Smart Evaluation**: Evaluates both semantic correctness and phrasing similarity
- **Progress Tracking**: Monitor improvement over time with detailed analytics
- **Content-Based**: Generates questions from provided educational markdown files
- **Frontend-Only**: No backend required, runs entirely in the browser

## Setup

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure OpenAI API Key**
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to the `.env` file
   - Or configure it through the app's settings panel

3. **Add Educational Content**
   - Place your markdown files in the `data/` directory
   - The app will automatically parse and generate questions from this content

4. **Start Development Server**
   ```bash
   npm start
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## GitHub Pages Deployment

This app is designed to work on GitHub Pages without a backend. Users enter their own OpenAI API keys through the settings panel.

### Deploy to GitHub Pages:

1. **Update Repository Settings**
   - Update `package.json` homepage field with your GitHub username:
   ```json
   "homepage": "https://your-username.github.io/aitutor"
   ```

2. **Deploy to GitHub Pages**
   ```bash
   npm run deploy
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Folder: / (root)

4. **Users Add Their API Keys**
   - Users visit your deployed app
   - App prompts for OpenAI API key on first visit
   - API key is stored securely in localStorage
   - Users get their API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### Security Notes:
- ✅ No API keys in the repository or deployed code
- ✅ Users provide their own API keys
- ✅ API keys stored locally in browser only
- ✅ Settings panel allows key management

## Usage

1. **Configure API Key**: Set up your OpenAI API key in the settings panel
2. **Select Mode**: Choose between Training (with hints) or Assessment (formal testing)
3. **Answer Questions**: Respond using text input or voice recognition
4. **Get Feedback**: Receive AI-powered evaluation and suggestions
5. **Track Progress**: Monitor your improvement over time

## Technology Stack

- **React 19**: Frontend framework
- **Webpack 5**: Module bundler
- **Tailwind CSS**: Styling framework
- **OpenAI API**: AI evaluation and feedback
- **Web Speech API**: Voice recognition and synthesis
- **Jest**: Testing framework

## Project Structure

```
src/
├── components/          # React components
├── services/           # API and business logic services
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── __tests__/          # Test files
└── App.js              # Main application component
```

## Development

- `npm start` - Start development server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build for production

## License

ISC