"use client"

import React, { useEffect, useState, useRef } from "react";
import styles from "./Participant.module.css";

interface Message {
    sender: string;
    text: string;
}

const Participant: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Dummy speach
    const [speechEnabled, setSpeechEnabled] = useState(false);

    const enableSpeech = () => {
        const utter = new SpeechSynthesisUtterance("Speech enabled!");
        window.speechSynthesis.speak(utter);
        setSpeechEnabled(true);
    };

    // Read text out loud
    const speakText = (text: string) => {
        if (!text) return;

        // Stop any ongoing speech to avoid overlap
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1; // optional: speed
        utterance.pitch = 1; // optional: pitch

        window.speechSynthesis.speak(utterance);
    };

    // Connect to WebSocket server
    useEffect(() => {
        const ws = new WebSocket("ws://localhost:3000");
        wsRef.current = ws;

        ws.onopen = () => console.log("✅ Connected to backend");

        ws.onmessage = async (event) => {
            let messageObj: Message = { sender: "Server", text: "" };

            if (typeof event.data === "string") {
                try {
                    const parsed = JSON.parse(event.data);
                    messageObj = {
                        sender: parsed.sender || "Unknown",
                        text: parsed.message || (parsed.data?.items?.join(" ") ?? "")
                    };
                } catch {
                    messageObj.text = event.data; // fallback plain text
                }
            } else if (event.data instanceof Blob) {
                console.log("Received Blob:");
                messageObj.text = await event.data.text();
            } else {
                messageObj.text = JSON.stringify(event.data);
            }

            setMessages((prev) => [...prev, messageObj]);

            // Speak aloud **only if it's from Reviewer**
            if (messageObj.sender === "Agent") {
                speakText(messageObj.text);
            }

            // if (messageObj.sender === "Reviewer" || messageObj.sender === "Agent") {
            //     speakText(messageObj.text);
            // }
        };

        ws.onclose = () => console.log("❌ Disconnected");

        return () => ws.close();
    }, []);

    // Scroll to the bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Send a message
    const sendMessage = (msg: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(msg);
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Participant</h2>
            <div className={styles.messagesContainer}>
                {messages.map((msg, i) => (
                    <div key={i}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <input
                type="text"
                placeholder="Type a message"
                className={styles.inputBox}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        sendMessage(e.currentTarget.value);
                        e.currentTarget.value = "";
                    }
                }}
            />
            {!speechEnabled && <button onClick={enableSpeech}>Enable Speech</button>}
        </div>

    );
};

export default Participant;
