# English Mastery with Podcasts and AI

An innovative SaaS platform designed to help learners master English by seamlessly integrating listening, writing, and conversation—all centered around engaging podcast content.

## Features

- **Focused Audio Sessions**: Listen to curated podcasts set at your optimal comprehension level.
- **AI-Powered Writing Feedback**: Get detailed feedback on your writing with grammar corrections, vocabulary suggestions, and comparisons to reference answers.
- **Real-World Conversation Practice**: Practice speaking by answering podcast questions and receive AI feedback on pronunciation, fluency, and clarity.
- **Context-Aware Translation**: Tap on unfamiliar words to receive contextually accurate translations.
- **Timestamped YouTube Shorts**: Practice with interactive YouTube videos featuring clickable dialogue lines that jump to specific timestamps.

## Technologies Used

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Firebase (Authentication, Firestore, Storage)
- Gemini 2.0 Flash API for AI-powered feedback
- Deepgram for real-time speech transcription
- YouTube IFrame API for video integration

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Firebase account
- Gemini API key
- Deepgram API key

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd english-mastery
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add your API keys:

   ```
   # Copy the template file
   cp .env.local.template .env.local

   # Then edit .env.local and add your actual API keys:
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## API Keys Setup

### Deepgram API Key

1. Sign up for a Deepgram account at [console.deepgram.com](https://console.deepgram.com/)
2. Create a new project
3. Go to API Keys and generate a new key with appropriate permissions
4. Add the API key to your `.env.local` file

### Gemini API Key

1. Sign up for Google AI Studio at [ai.google.dev](https://ai.google.dev/)
2. Create an API key
3. Add the API key to your `.env.local` file

## Testing the APIs

The application includes an API test page that allows you to verify that your Deepgram and Gemini APIs are properly configured:

1. Start the development server
2. Navigate to [http://localhost:3000/api-test](http://localhost:3000/api-test)
3. Test each API:
   - **Deepgram**: Click "Start Recording" to test real-time speech transcription
   - **Gemini**: Click "Test Gemini API" to test the AI feedback capabilities

If you encounter any issues:

- Check that your API keys are correctly set in the `.env.local` file
- Verify that your API keys have the correct permissions
- Check the browser console and server logs for error messages

## Usage

1. **Home Page**: Learn about the platform and its features.
2. **Dashboard**: Browse available podcasts filtered by difficulty level.
3. **Podcast Detail Page**: Access the four learning modes:
   - **Listen**: Play the podcast with optional transcript.
   - **Write**: Submit a written response and get AI feedback.
   - **Speak**: Practice conversation by answering questions verbally.
   - **Translate**: Click on words to get contextual translations.
4. **Timestamped YouTube Demo**: Practice with interactive YouTube videos:
   - Click on dialogue lines to jump to specific timestamps
   - Use practice mode to speak along with the video
   - Get real-time transcription of your speech

## Demo

A sample podcast is included for demonstration purposes. You can access it by clicking "Try Demo" on the home page or navigating to `/podcasts/sample-podcast-1`.

Two interactive YouTube demos are also available:

- **Dramatic Dialogue**: Access by clicking "Try Timestamped Demo" on the home page or navigating to `/timestamped-demo`
- **Casual Conversation**: Navigate to `/timestamped-demo-2` or click the link in the first demo

## License

This project is licensed under the MIT License - see the LICENSE file for details.
