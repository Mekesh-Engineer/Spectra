import { useState, useCallback, useRef, useEffect } from "react";
import { auth } from "@/lib/firebase";

export function useWebRTC(signalingUrl: string, room: string) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setRemoteStream(null);
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      cleanup();

      // Get current Firebase ID token for WebSocket auth
      const user = auth.currentUser;
      if (!user) {
        setError("Not authenticated — cannot connect to signaling server");
        return;
      }
      const idToken = await user.getIdToken();

      const ws = new WebSocket(signalingUrl);
      wsRef.current = ws;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = pc;

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0] ?? null);
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setConnected(state === "connected" || state === "completed");
        if (state === "failed" || state === "disconnected") {
          setError("WebRTC connection lost");
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
        }
      };

      ws.onopen = () => {
        // MUST authenticate first — server requires auth message before join
        ws.send(JSON.stringify({ type: "auth", token: idToken }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        // Handle auth response then join room
        if (msg.type === "auth" && msg.status === "ok") {
          ws.send(JSON.stringify({ type: "join", room }));
          return;
        }

        try {
          if (msg.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", sdp: answer }));
          } else if (msg.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          } else if (msg.type === "ice-candidate" && msg.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "WebRTC signaling error");
        }
      };

      ws.onerror = () => setError("Signaling connection error");
      ws.onclose = (event) => {
        setConnected(false);
        if (event.code === 4001) setError("WebSocket authentication timeout");
        if (event.code === 4003) setError("WebSocket authentication failed");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "WebRTC connection failed");
    }
  }, [signalingUrl, room, cleanup]);

  const sendOffer = useCallback(async (localStream: MediaStream) => {
    const pc = peerRef.current;
    const ws = wsRef.current;
    if (!pc || !ws) return;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", sdp: offer }));
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    connected,
    error,
    remoteStream,
    connect,
    sendOffer,
    disconnect: cleanup,
  };
}
