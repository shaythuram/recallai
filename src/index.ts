import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import WebSocket from "ws";
import fs from "fs";
import path from "path";
import http from "http";

import {
  AsyncRequestHandler,
  AudioDataEvent,
  VideoSeparatePngDataEvent,
  AudioSeparateRawDataEvent,
  TranscriptDataEvent,
  RecallBotWebSocketMessage,
} from "./types";

dotenv.config();

const app: express.Express = express();
const expressPort = parseInt(process.env.PORT || "3000");
const websocketPort = parseInt(process.env.WEBSOCKET_PORT || "3456");
const additionalPort4000 = 4001;
const additionalPort5000 = 5001;

const server = http.createServer(app);

// --- UI WebSocket Server Setup ---
// This WebSocket server is for sending log messages from this backend to the browser UI.
const uiWss = new WebSocket.Server({ server, path: "/ui-updates" });
let uiClients = new Set<WebSocket>();

// --- Additional WebSocket Servers for Ports 4000 and 5000 ---
const additionalWss4000 = new WebSocket.Server({ port: additionalPort4000 });
const additionalWss5000 = new WebSocket.Server({ port: additionalPort5000 });
let additionalClients4000 = new Set<WebSocket>();
let additionalClients5000 = new Set<WebSocket>();

// Function to send a message to all connected browser UI clients
function broadcastToUIClients(logMessage: string, data?: any) {
  const message = JSON.stringify({
    log: logMessage,
    data: data,
    timestamp: new Date().toISOString(),
  });
  
  // Send to main UI clients (port 3000)
  uiClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  // Send to additional port 4000 clients
  additionalClients4000.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  // Send to additional port 5000 clients
  additionalClients5000.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  // Also log the broadcasted message to the server console
  console.log(`[Multi-Port Broadcast] ${logMessage}`, data || "");
}

uiWss.on("connection", (ws) => {
  uiClients.add(ws);
  console.log("UI WebSocket client connected to port 3000");
  broadcastToUIClients("New UI client connected to server logs (port 3000).");

  ws.on("close", () => {
    uiClients.delete(ws);
    console.log("UI WebSocket client disconnected from port 3000");
  });
  ws.on("error", (error) => console.error("UI WebSocket error (port 3000):", error));
});

// --- Additional WebSocket Server Event Handlers ---
// Port 4000 WebSocket server
additionalWss4000.on("listening", () => {
  console.log(`Additional WebSocket server is listening on port ${additionalPort4000}`);
  broadcastToUIClients(`Additional WebSocket server started on port ${additionalPort4000}`);
});

additionalWss4000.on("connection", (ws) => {
  additionalClients4000.add(ws);
  console.log("WebSocket client connected to port 4000");
  broadcastToUIClients("New client connected to port 4000");

  ws.on("close", () => {
    additionalClients4000.delete(ws);
    console.log("WebSocket client disconnected from port 4000");
  });
  ws.on("error", (error) => console.error("WebSocket error (port 4000):", error));
});

// Port 5000 WebSocket server
additionalWss5000.on("listening", () => {
  console.log(`Additional WebSocket server is listening on port ${additionalPort5000}`);
  broadcastToUIClients(`Additional WebSocket server started on port ${additionalPort5000}`);
});

additionalWss5000.on("connection", (ws) => {
  additionalClients5000.add(ws);
  console.log("WebSocket client connected to port 5000");
  broadcastToUIClients("New client connected to port 5000");

  ws.on("close", () => {
    additionalClients5000.delete(ws);
    console.log("WebSocket client disconnected from port 5000");
  });
  ws.on("error", (error) => console.error("WebSocket error (port 5000):", error));
});
// --- End Additional WebSocket Server Event Handlers ---
// --- End UI WebSocket Server Setup ---

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

app.get("/", (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/transcriptions", (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "transcriptions.html"));
});

// Lightweight endpoint to verify the UI WebSocket broadcast channel
// Visit http://localhost:3000/ui-test to send a test message to all /ui-updates clients
app.get("/ui-test", (req: express.Request, res: express.Response) => {
  const testPayload = {
    path: req.path,
    from: "ui-test",
    at: new Date().toISOString(),
  };
  broadcastToUIClients("UI test broadcast from /ui-test", testPayload);
  res.json({ ok: true, broadcasted: testPayload });
});

// --- Recall.ai API Interaction Endpoint ---
// Handles requests from the browser UI to send a bot to a meeting via Recall.ai API
const sendBotHandler: AsyncRequestHandler = async (req, res, next) => {
  const { meeting_url, bot_name, recording_config } = req.body;
  const apiKey = process.env.RECALL_API_KEY;

  if (!meeting_url) {
    broadcastToUIClients("Error in /send-bot: meeting_url is required");
    return res.status(400).json({ error: "meeting_url is required" });
  }
  if (!apiKey) {
    broadcastToUIClients(
      "Error in /send-bot: RECALL_API_KEY is not set in server environment"
    );
    return res
      .status(500)
      .json({ error: "RECALL_API_KEY is not set in environment variables" });
  }

  try {
    const recallApiUrl = "https://us-west-2.recall.ai/api/v1/bot"; // Recall.ai endpoint to create a bot

    // Prepare the payload for the Recall.ai API
    const payload: any = {
      meeting_url: meeting_url,
      bot_name: bot_name || "Meeting Notetaker",
    };
    // If recording_config is provided by the client (for real-time events), add it to the payload
    if (recording_config) {
      payload.recording_config = recording_config;
    }

    broadcastToUIClients(
      "Sending request to Recall.ai API (/v1/bot) with payload:",
      payload
    );
    const response = await axios.post(recallApiUrl, payload, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    broadcastToUIClients(
      "Successfully called Recall.ai API. Response:",
      response.data
    );
    res.status(response.status).json(response.data); // Send Recall.ai's response back to our UI (though UI doesn't use it directly now)
  } catch (error: any) {
    const errorMsg = error.response?.data || error.message;
    console.error("Error calling Recall.ai API:", errorMsg);
    broadcastToUIClients("Error calling Recall.ai API:", errorMsg);
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({
      error: "Failed to send bot to meeting due to an internal server error.",
    });
  }
};
app.post("/send-bot", sendBotHandler);
// --- End Recall.ai API Interaction Endpoint ---

// --- WebSocket Server for Recall.ai Bot Connections ---
// This server listens for incoming WebSocket connections from the Recall.ai bot after it has joined a meeting.
// It receives real-time events (audio, video, transcripts) from the bot.
const recallBotWss = new WebSocket.Server({ port: websocketPort });

recallBotWss.on("listening", () => {
  const listenMsg = `Recall Bot WebSocket server is listening on port ${websocketPort}`;
  console.log(listenMsg);
  broadcastToUIClients(listenMsg);
});

recallBotWss.on("connection", (ws) => {
  const connectedMsg =
    "Recall Bot WebSocket client connected (Recall.ai bot has connected to this server).";
  console.log(connectedMsg);
  broadcastToUIClients(connectedMsg);

  // Handle messages received from a connected Recall.ai bot
  ws.on("message", (message: WebSocket.Data) => {
    try {
      const wsMessage = JSON.parse(
        message.toString()
      ) as RecallBotWebSocketMessage;

      // Process different types of real-time events from the bot
      if (wsMessage.event === "audio_mixed_raw.data") {
        const audioEvent = wsMessage as AudioDataEvent;
        const recId = audioEvent.data.recording.id;
        const audioMsg = `Received mixed audio (audio_mixed_raw.data) for recording ID: ${recId}`;
        broadcastToUIClients(audioMsg, {
          recordingId: recId,
          bufferSize: audioEvent.data.data.buffer.length,
        });
      } else if (wsMessage.event === "video_separate_png.data") {
        const videoEvent = wsMessage as VideoSeparatePngDataEvent;
        const participantInfo = videoEvent.data.data.participant;
        const videoMsg = `Received separate participant video (video_separate_png.data) for: ${
          participantInfo.name || participantInfo.id
        } (${videoEvent.data.data.type})`;
        broadcastToUIClients(videoMsg, {
          participant: participantInfo,
          type: videoEvent.data.data.type,
          timestamp: videoEvent.data.data.timestamp,
          bufferSize: videoEvent.data.data.buffer.length,
        });
      } else if (wsMessage.event === "audio_separate_raw.data") {
        const separateAudioEvent = wsMessage as AudioSeparateRawDataEvent;
        const participantInfo = separateAudioEvent.data.data.participant;
        const audioMsg = `Received separate participant audio (audio_separate_raw.data) for: ${
          participantInfo.name || participantInfo.id
        }`;
        broadcastToUIClients(audioMsg, {
          participant: participantInfo,
          timestamp: separateAudioEvent.data.data.timestamp,
          bufferSize: separateAudioEvent.data.data.buffer.length,
        });
      } else if (
        wsMessage.event === "transcript.data" ||
        wsMessage.event === "transcript.partial_data"
      ) {
        const transcriptEvent = wsMessage as TranscriptDataEvent;
        const eventMsg = `Received transcript event: ${transcriptEvent.event}`;
        broadcastToUIClients(eventMsg, transcriptEvent.data);
      } else {
        const unhandledMsg = `Unhandled Recall Bot WebSocket message event: ${wsMessage.event}`;
        broadcastToUIClients(unhandledMsg, wsMessage.data);
      }
    } catch (e: any) {
      const errorDetails = e.message || e;
      const errMsg =
        "Error parsing message from Recall Bot WebSocket or processing data:";
      console.error(
        errMsg,
        errorDetails,
        message.toString().substring(0, 200) + "..."
      ); // Log more of the message for debugging
      broadcastToUIClients(errMsg, {
        error: errorDetails,
        receivedMessage: message.toString().substring(0, 100) + "...",
      });
    }
  });

  ws.on("error", (error) => {
    const errMsg = "Recall Bot WebSocket connection error:";
    console.error(errMsg, error);
    broadcastToUIClients(errMsg, { error: error.message });
  });

  ws.on("close", () => {
    const closeMsg =
      "Recall Bot WebSocket client disconnected (Recall.ai bot disconnected).";
    console.log(closeMsg);
    broadcastToUIClients(closeMsg);
  });
});
// --- End WebSocket Server for Recall.ai Bot Connections ---

// Start the HTTP server (which also hosts the UI WebSocket server)
server.listen(expressPort, () => {
  const serverStartMsg = `HTTP server with UI WebSocket is running at http://localhost:${expressPort}`;
  console.log(serverStartMsg);
  broadcastToUIClients(serverStartMsg);
  broadcastToUIClients(
    `Connect your Recall.ai bot WebSocket to: ws://YOUR_PUBLIC_IP_OR_NGROK_URL:${websocketPort}`
  );
  broadcastToUIClients(
    `Additional WebSocket servers available at: ws://localhost:${additionalPort4000} and ws://localhost:${additionalPort5000}`
  );
});
