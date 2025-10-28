"use client"
import styles from "./SpeachForm.module.css"

import React, { useState, useRef, useEffect } from "react";

const SpeechForm: React.FC = () => {
    const [text, setText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    interface FollowUpPayload {
        items: string[];
        createdAt: number;
    }

    // Connect to backend websocket
    useEffect(() => {
        const ws = new WebSocket("ws://localhost:3000");
        ws.onopen = () => console.log("✅ Connected to backend");
        ws.onmessage = (msg) => console.log("Server:", msg.data);
        ws.onclose = () => console.log("❌ Disconnected");
        setSocket(ws);
        return () => ws.close();
    }, []);

    // Initialize speech recognition
    const initSpeech = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser");
            return null;
        }

        // Set SpeechRecognition instance and other properties
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Event handlers for speech recognition
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setText(transcript);
            console.log("Heard:", transcript);
        };

        // Error handling if something goes wrong
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
        };

        // Stop listening when the user stops speaking
        recognition.onend = () => {
            setIsListening(false);
        };

        return recognition;
    };

    // Start or Stop listening
    const handleMicClick = () => {
        if (isListening) {
            // Stop listening
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const recognition = initSpeech();
            if (recognition) {
                // Start listening
                recognitionRef.current = recognition;
                recognition.start();
                setIsListening(true);
            }
        }
    };

    // Normalize items to an array of strings
    // Split the input string into parts whenever a comma appears & Trim whitespace from each item
    // Filter out any empty strings (caused by extra commas or blank input)
    const normalizeItems = (raw: string): string[] => {
        const splitItems = raw.split(" ");
        const trimmedItems = splitItems.map((item) => item.trim());
        const nonEmptyItems = trimmedItems.filter((item) => item.length > 0);
        return nonEmptyItems;
    };

    // Send items to the server
    const handleSend = () => {
        // Check if we have a connection
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            alert("Socket not connected!");
            return;
        }

        // Create a payload with the items & validate we have at least one item
        const items = normalizeItems(text);
        if (items.length === 0) {
            alert("Please provide at least one item.");
            return;
        }

        const payload: FollowUpPayload = {
            items,
            createdAt: Date.now(),
        };

        // Send the payload to the server
        socket.send(JSON.stringify({ event: "followup:create", data: payload }));
        console.log("Sent:", payload);
    };

    return (
        <div className={styles.container}>
            <button onClick={handleMicClick}>
                {isListening ? "Listening..." : "Start Speaking"}
            </button>

            <input
                type="text"
                placeholder="Or type manually..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />

            <p>Detected text: {text || "Waiting for input..."}</p>
            <button onClick={handleSend}>Send to Server</button>
        </div>
    );
};

export default SpeechForm;
