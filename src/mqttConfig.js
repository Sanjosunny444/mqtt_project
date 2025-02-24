// mqttConfig.js
import mqtt from "mqtt";

const {
  REACT_APP_MQTT_BROKER_URL,
  REACT_APP_MQTT_USERNAME,
  REACT_APP_MQTT_PASSWORD,
  REACT_APP_MQTT_PROTOCOL,
  REACT_APP_MQTT_CLIENT_ID,
} = process.env;
// MQTT broker details
const brokerUrl =  REACT_APP_MQTT_BROKER_URL;; // Replace with your broker URL
const options = {
  username: REACT_APP_MQTT_USERNAME, // Replace with your MQTT username
  password: REACT_APP_MQTT_PASSWORD, // Replace with your MQTT password
  protocol: REACT_APP_MQTT_PROTOCOL,
  clientId: REACT_APP_MQTT_CLIENT_ID,
};

// Create MQTT client
const mqttClient = mqtt.connect(brokerUrl, options);

// Log connection status
mqttClient.on("connect", () => {
  console.log("Connected to HiveMQ Cloud!");
});
    
// Log errors
mqttClient.on("error", (error) => {
  console.error("MQTT Error:", error);
});

export { mqttClient };