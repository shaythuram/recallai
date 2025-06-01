# Recall.ai Real-time Events Starter Kit

This sample application demonstrates how to interact with the Recall.ai API to send a bot to a meeting and subscribe to various real-time events via WebSockets. It provides a simple web interface to configure and dispatch the bot, and logs received real-time events to the browser.

This starter kit is designed to help developers quickly understand and implement real-time data streaming with Recall.ai.

## Features

- Send a Recall.ai bot to a meeting (e.g., Google Meet, Zoom).
- Configure subscriptions for various real-time events:
  - Mixed audio from the call (`audio_mixed_raw.data`)
  - Full and partial transcripts (`transcript.data`, `transcript.partial_data`)
  - Separate participant video (`video_separate_png.data`)
  - Separate participant audio (`audio_separate_raw.data`)
- Real-time log display in the browser showing events received from the Recall.ai bot via WebSockets.

## Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)
- **Recall.ai API Key**: You'll need an API key from your [Recall.ai Dashboard](https://us-west-2.recall.ai/dashboard/developers/api-keys).
- **Ngrok** (or a similar tunneling service): Required to expose your local WebSocket server to the internet so Recall.ai can connect to it for real-time event delivery. You can download it from [ngrok.com](https://ngrok.com/download).

## Getting Started

### 1. Clone the Repository

```bash
git clone TODO
cd TODO
```

### 2. Install Dependencies

Navigate to the project directory and install the necessary packages:

```bash
npm install
```

### 3. Configure Environment Variables

This project uses a `.env` file to manage sensitive information and configuration.

1.  **Create a `.env` file:** In the root of the project, create a new file named `.env`.
    You can copy the `env.example` file if one is provided in the repository:

    ```bash
    cp .env.example .env
    ```

2.  **Add Your Recall.ai API Key:** Open the `.env` file and add your Recall.ai API key:

    ```env
    RECALL_API_KEY=YOUR_RECALL_API_KEY_HERE
    ```

### 4. Set up Ngrok (for Real-time Events)

To receive real-time events from the Recall.ai bot, your local server's WebSocket endpoint needs to be publicly accessible. Ngrok is a great tool for this.

1.  **Start Ngrok:** Open a new terminal window and run ngrok to forward to your **WebSocket server port** (default is `3456`, or the `WEBSOCKET_PORT` you set in `.env`).

    ```bash
    ngrok http 3456
    ```

    _(If you configured a different `WEBSOCKET_PORT`, use that number instead of 3456.)_

2.  **Get the Ngrok URL:** Ngrok will display a public forwarding URL in its terminal output. It will look something like `https://random-string.ngrok-free.app` (if you're on a free plan) or use your custom domain if you have one.
    You will need the **`wss://`** (WebSocket Secure) version of this URL for the application. For example, if ngrok shows `https://abcdef12345.ngrok-free.app`, you will use `wss://abcdef12345.ngrok-free.app`.

    Keep this `wss://` URL handy. You'll enter it into the web UI.

### 5. Run the Application

Once dependencies are installed and your `.env` file is configured, start the server:

```bash
npm run dev
```

By default, the web UI will be accessible at `http://localhost:3000` (or your configured `PORT`).
The server console will show messages indicating that the HTTP server and the Recall Bot WebSocket server are running.

## Using the Application

1.  **Open the Web UI:** Navigate to `http://localhost:3000` (or your configured `PORT`) in your web browser.

2.  **Review Instructions:** The page provides brief instructions on API key setup and ngrok usage.

3.  **Enter Meeting Details:**

    - **Meeting URL:** Provide a valid meeting URL (e.g., from Google Meet, Zoom).
    - **Bot Name (Optional):** You can give your bot a custom name.

4.  **Select Real-time Event Subscriptions:**

    - Check the boxes for the real-time events you want to receive (e.g., mixed audio, transcripts, separate participant video/audio).

5.  **Enter Public WebSocket URL:**

    - In the "Public WebSocket URL" field, paste the **`wss://`** forwarding URL you obtained from `ngrok` in the setup steps.
    - This field is required if you select any real-time event subscriptions.

6.  **Send the Bot:** Click the "Send Bot" button.

7.  **Observe Logs:**

    - The "Real-time Server Log" section on the web page will display:
      - Status messages from the server (e.g., API call attempts, WebSocket connections).
      - The actual real-time event data received from the Recall.ai bot.
    - The server console (where you ran `npm run dev`) will also show these logs and any errors.

This starter kit is intended to be a foundation. Feel free to expand upon it, add more sophisticated error handling, or integrate other Recall.ai API features.
