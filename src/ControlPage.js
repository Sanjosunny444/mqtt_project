// src/CommandPage.js
import React, { useEffect, useState } from "react";
import { TextField, Button, Typography, Box } from "@mui/material";
import { mqttClient } from "./mqttConfig"; // Shared MQTT client
import { database } from "./firebase"; // Firebase database
import { ref, set, onValue } from "firebase/database";

function CommandPage() {
  const [hour, setHour] = useState("");
  const [mode, setMode] = useState("");
  const [timeLeft, setTimeLeft] = useState(null); // Tracks the remaining time
  const [isTimerActive, setIsTimerActive] = useState(false); // Tracks if the timer is active

  // Save state to Firebase whenever it changes
  useEffect(() => {
    const controlStateRef = ref(database, "controlState");
    set(controlStateRef, { hour, mode, timeLeft });
  }, [hour, mode, timeLeft]);

  // Fetch saved state from Firebase when the component mounts
  useEffect(() => {
    const controlStateRef = ref(database, "controlState");
    onValue(controlStateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHour(data.hour || "");
        setMode(data.mode || "");
        setTimeLeft(data.timeLeft || null);
        setIsTimerActive(!!data.timeLeft); // Timer is active if timeLeft exists
      }
    });
  }, []);

  // Publish Hour
  const publishHour = () => {
    if (hour.trim() !== "") {
      // Save to Firebase first
      const controlStateRef = ref(database, "controlState");
      set(controlStateRef, { hour, mode, timeLeft });

      // Then publish to MQTT
      mqttClient.publish("hour", hour);
      startTimer(parseInt(hour)); // Start the countdown timer
      setHour(""); // Clear the input field after publishing
    }
  };

  // Publish Mode
  const publishMode = () => {
    if (mode.trim() !== "") {
      // Save to Firebase first
      const controlStateRef = ref(database, "controlState");
      set(controlStateRef, { hour, mode, timeLeft });

      // Then publish to MQTT
      mqttClient.publish("mode", mode);
      setMode(""); // Clear the input field after publishing
    }
  };

  // Start the countdown timer
  const startTimer = (hours) => {
    const totalSeconds = hours * 3600; // Convert hours to seconds
    setTimeLeft(totalSeconds);
    setIsTimerActive(true);
  };

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft > 0 && isTimerActive) {
      const timer = setTimeout(() => {
        setTimeLeft((prevTime) => prevTime - 1); // Decrease time by 1 second
      }, 1000);

      return () => clearTimeout(timer); // Cleanup timer on unmount or reset
    } else if (timeLeft === 0) {
      setIsTimerActive(false); // Stop the timer when it reaches 0
      alert("Timer completed!");
    }
  }, [timeLeft, isTimerActive]);

  // Format time left into HH:MM:SS
  const formatTimeLeft = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Box sx={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Command Panel
      </Typography>

      {/* Input for Hour */}
      <Box sx={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
        <TextField
          label="Set Hour"
          type="number"
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          sx={{ marginRight: "10px" }}
        />
        <Button variant="contained" onClick={publishHour}>
          Publish Hour
        </Button>
      </Box>

      {/* Input for Mode */}
      <Box sx={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>
        <TextField
          label="Set Mode"
          type="number"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          sx={{ marginRight: "10px" }}
        />
        <Button variant="contained" onClick={publishMode}>
          Publish Mode
        </Button>
      </Box>

      {/* Timer Display */}
      {isTimerActive && (
        <Box sx={{ marginTop: "20px" }}>
          <Typography variant="h6">Time Left: {formatTimeLeft(timeLeft)}</Typography>
        </Box>
      )}
    </Box>
  );
}

export default CommandPage;