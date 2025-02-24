import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Typography, Box, CircularProgress, Grid, Paper, Button } from "@mui/material";
import { mqttClient } from "./mqttConfig"; // Shared MQTT client
import { database } from "./firebase"; // Firebase database
import { ref, onValue } from "firebase/database";

const GraphPage = () => {
  const [oneHourData, setOneHourData] = useState([]);
  const [twentyFourHourData, setTwentyFourHourData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the MQTT client is already connected
    if (!mqttClient.connected) {
      console.log("MQTT client is not connected. Attempting to reconnect...");
      mqttClient.reconnect();
    }

    // Subscribe to MQTT topics
    mqttClient.subscribe(["sensor/turbidity", "sensor/tds", "sensor/temperature"]);

    // Handle incoming MQTT messages
    mqttClient.on("message", (topic, message) => {
      const value = parseFloat(message.toString());
      if (isNaN(value)) return;

      const timestamp = new Date().toLocaleTimeString(); // Unique timestamp for each message
      const sensorType = topic.split("/")[1];

      // Update 1-hour data
      setOneHourData((prevData) => {
        const newData = [...prevData];
        const latestEntry = newData.length > 0 ? { ...newData[newData.length - 1] } : {};
        latestEntry.time = timestamp; // Ensure the timestamp is updated
        latestEntry[sensorType] = value;
        newData.push(latestEntry);
        return newData.slice(-12); // Keep only the last 12 data points
      });

      // Update 24-hour data
      setTwentyFourHourData((prevData) => {
        const newData = [...prevData];
        const latestEntry = newData.length > 0 ? { ...newData[newData.length - 1] } : {};
        latestEntry.time = timestamp; // Ensure the timestamp is updated
        latestEntry[sensorType] = value;
        newData.push(latestEntry);
        return newData.slice(-24); // Keep only the last 24 data points
      });
    });

    // Fetch historical data from Firebase
    const fetchHistoricalData = () => {
      const turbidityRef = ref(database, "sensor/turbidity");
      onValue(turbidityRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const formattedData = Object.values(data).map((entry) => ({
            time: entry.time,
            turbidity: entry.turbidity || null,
            tds: null,
            temperature: null,
          }));
          setOneHourData((prevData) => [...formattedData, ...prevData].slice(-12));
          setTwentyFourHourData((prevData) => [...formattedData, ...prevData].slice(-24));
        }
      });

      const tdsRef = ref(database, "sensor/tds");
      onValue(tdsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const formattedData = Object.values(data).map((entry) => ({
            time: entry.time,
            turbidity: null,
            tds: entry.tds || null,
            temperature: null,
          }));
          setOneHourData((prevData) => [...formattedData, ...prevData].slice(-12));
          setTwentyFourHourData((prevData) => [...formattedData, ...prevData].slice(-24));
        }
      });

      const temperatureRef = ref(database, "sensor/temperature");
      onValue(temperatureRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const formattedData = Object.values(data).map((entry) => ({
            time: entry.time,
            turbidity: null,
            tds: null,
            temperature: entry.temperature || null,
          }));
          setOneHourData((prevData) => [...formattedData, ...prevData].slice(-12));
          setTwentyFourHourData((prevData) => [...formattedData, ...prevData].slice(-24));
        }
      });
    };

    fetchHistoricalData();

    // Stop loading once connected
    mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker");
      setIsLoading(false);
    });

    // Log errors
    mqttClient.on("error", (error) => {
      console.error("MQTT Error:", error);
      setIsLoading(false); // Stop loading state in case of an error
    });

    return () => {
      // Cleanup subscriptions
      mqttClient.unsubscribe(["sensor/turbidity", "sensor/tds", "sensor/temperature"]);
    };
  }, []);

  // Function to export data as CSV
  const exportToCSV = (data, filename) => {
    const headers = ["Time", "Turbidity", "TDS", "Temperature"].join(",");
    const rows = data.map((entry) => {
      const { time, turbidity, tds, temperature } = entry;
      return [time, turbidity || "", tds || "", temperature || ""].join(",");
    });
    const csvContent = `${headers}\n${rows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Sensor Data Visualization
      </Typography>
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && (
        <Grid container spacing={3}>
          {/* 1-Hour Graph */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ padding: "20px", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <Typography variant="h6" gutterBottom>
                  Last 1 Hour Data
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => exportToCSV(oneHourData, "1_hour_data.csv")}
                >
                  Download Data
                </Button>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={oneHourData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 50]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="turbidity" stroke="green" />
                  <Line type="monotone" dataKey="tds" stroke="blue" />
                  <Line type="monotone" dataKey="temperature" stroke="red" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          {/* 24-Hour Graph */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ padding: "20px", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <Typography variant="h6" gutterBottom>
                  Last 24 Hours Data
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => exportToCSV(twentyFourHourData, "24_hour_data.csv")}
                >
                  Download Data
                </Button>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={twentyFourHourData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 50]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="turbidity" stroke="green" />
                  <Line type="monotone" dataKey="tds" stroke="blue" />
                  <Line type="monotone" dataKey="temperature" stroke="red" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default GraphPage;