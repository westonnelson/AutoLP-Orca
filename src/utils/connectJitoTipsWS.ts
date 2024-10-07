import WebSocket from "ws";

// TODO: add types for websocket message
// interface ParsedMessage {
// }

export async function connectJitoTipsWS(
  onMessage: (message: any) => void
): Promise<void> {
  const ws = new WebSocket(
    "ws://bundles-api-rest.jito.wtf/api/v1/bundles/tip_stream", // Jito Tips public WebSocket url
    {
      handshakeTimeout: 30000,
    }
  );

  ws.on("open", () => {
    // console.info("Connected to Jito Tips WebSocket");
  });

  ws.on("message", (message: WebSocket.Data) => {
    try {
      const parsedMessage = JSON.parse(message as string);
      onMessage(parsedMessage);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    console.info("Jito Tips WebSocket closed...");
  });

  ws.on("error", (error) => {
    console.error("Error connecting to Jito Tips WebSocket:", error);
    console.info(
      "Jito Tips WebSocket error, attempting to reconnect in 30 seconds..."
    );
    setTimeout(() => connectJitoTipsWS(onMessage), 30000);
  });
}
