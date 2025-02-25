#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <queue>
#include <mutex>

const char* ssid = "ssid";
const char* password = "pass";

const char* mqtt_server = ".......................s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "username";
const char* mqtt_password = "password"; 

const float low_turb = 1.0;
const float normal_turb = 3.0;
const float low_tds = 20.0;
const float normal_tds = 100.0;

const float low_temp = 15.0;
const float normal_temp_low = 15.0;
const float normal_temp_high = 30.0;

volatile int hour = 0;
volatile int mode = 0;

volatile float avgTurbidity = 0.0;
char turbStatus[20] = "";
volatile float avgTDS = 0.0;
char tdsStatus[20] = "";
volatile float avgTemperature = 0.0;
char tempStatus[20] = "";

std::mutex dataMutex;

volatile bool systemActive = false;

WiFiClientSecure espClient;
PubSubClient client(espClient);

TaskHandle_t mqttTaskHandle = NULL;
TaskHandle_t sensorTaskHandle = NULL;
TaskHandle_t hourModeTaskHandle = NULL;

class Sensor {
private:
    std::queue<float> readings;
    int maxReadings = 10;

public:
    void addReading(float value) {
        if (readings.size() >= maxReadings) {
            readings.pop();
        }
        readings.push(value);
    }

    float calculateAverage() {
        float sum = 0.0;
        int count = readings.size();
        std::queue<float> temp = readings;
        while (!temp.empty()) {
            sum += temp.front();
            temp.pop();
        }
        return count > 0 ? sum / count : 0.0;
    }

    bool isQueueFull() {
        return readings.size() == maxReadings;
    }
};

Sensor turbiditySensor;
Sensor tdsSensor;
Sensor temperatureSensor;

void setup_wifi() {
    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    if (strcmp(topic, "hour") == 0) {
        hour = message.toInt();
        Serial.print("Received hour: ");
        Serial.println(hour);
    } else if (strcmp(topic, "mode") == 0) {
        mode = message.toInt();
        Serial.print("Received mode: ");
        Serial.println(mode);
    }
}

void reconnect() {
    while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        String clientId = "ESP32Client - MyClient";
        if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
            Serial.println("connected");
            client.subscribe("hour");
            client.subscribe("mode");        // for specified future improvements
        } else {
            Serial.print("failed, rc = ");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

void mqttTask(void *pvParameters) {
    for (;;) {
        if (!client.connected()) {
            reconnect();
        }
        client.loop();

        {
            std::lock_guard<std::mutex> lock(dataMutex);

            if (avgTurbidity != 0.0 && avgTDS != 0.0 && avgTemperature != 0.0) {
                char buffer[20];

                snprintf(buffer, sizeof(buffer), "%.2f", avgTurbidity);
                client.publish("sensor/turbidity", buffer);

                snprintf(buffer, sizeof(buffer), "%.2f", avgTDS);
                client.publish("sensor/tds", buffer);

                snprintf(buffer, sizeof(buffer), "%.2f", avgTemperature);
                client.publish("sensor/temperature", buffer);

                client.publish("sensor/temp_status", tempStatus);
                client.publish("sensor/tds_status", tdsStatus);
                client.publish("sensor/turb_status", turbStatus);

                avgTurbidity = 0.0;
                avgTDS = 0.0;
                avgTemperature = 0.0;
                strcpy(tempStatus, "");
                strcpy(tdsStatus, "");
                strcpy(turbStatus, "");
            }
        }

        vTaskDelay(5000 / portTICK_PERIOD_MS);
    }
}

void sensorTask(void *pvParameters) {
    for (;;) {
        if (systemActive) {
            float turbidityReading = random(0, 1000) / 100.0;
            float tdsReading = random(0, 20000) / 100.0;
            float temperatureReading = random(1000, 4000) / 100.0;

            Serial.print("Simulated Turbidity: ");
            Serial.println(turbidityReading);
            Serial.print("Simulated TDS: ");
            Serial.println(tdsReading);
            Serial.print("Simulated Temperature: ");
            Serial.println(temperatureReading);

            turbiditySensor.addReading(turbidityReading);
            tdsSensor.addReading(tdsReading);
            temperatureSensor.addReading(temperatureReading);

            if (turbiditySensor.isQueueFull() && tdsSensor.isQueueFull() && temperatureSensor.isQueueFull()) {
                float avgTurb = turbiditySensor.calculateAverage();
                float avgTds = tdsSensor.calculateAverage();
                float avgTemp = temperatureSensor.calculateAverage();

                {
                    std::lock_guard<std::mutex> lock(dataMutex);

                    avgTurbidity = avgTurb;
                    avgTDS = avgTds;
                    avgTemperature = avgTemp;

                    if (avgTemperature < low_temp) {
                        strcpy(tempStatus, "Low");
                    } else if (avgTemperature >= normal_temp_low && avgTemperature <= normal_temp_high) {
                        strcpy(tempStatus, "Normal");
                    } else {
                        strcpy(tempStatus, "High");
                    }

                    if (avgTurbidity <= low_turb) {
                        strcpy(turbStatus, "Low");
                    } else if (avgTurbidity <= normal_turb) {
                        strcpy(turbStatus, "Normal");
                    } else {
                        strcpy(turbStatus, "High");
                    }

                    if (avgTDS <= low_tds) {
                        strcpy(tdsStatus, "Low");
                    } else if (avgTDS <= normal_tds) {
                        strcpy(tdsStatus, "Normal");
                    } else {
                        strcpy(tdsStatus, "High");
                    }
                }

                turbiditySensor = Sensor();
                tdsSensor = Sensor();
                temperatureSensor = Sensor();
            }

            vTaskDelay(10000 / portTICK_PERIOD_MS);
        } else {
            vTaskDelay(1000 / portTICK_PERIOD_MS);
        }
    }
}

void hourModeTask(void *pvParameters) {
    for (;;) {
        if (hour > 0 && mode > 0) {
            Serial.print("System will operate for ");
            Serial.print(hour);
            Serial.print(" hours in mode ");
            Serial.println(mode);

            systemActive = true;

            for (int i = 0; i < hour; i++) {
                Serial.print("Hour ");
                Serial.print(i);
                Serial.println(" completed.");
                vTaskDelay(3600000 / portTICK_PERIOD_MS);
            }

            systemActive = false;
            Serial.println("Time complete. System is now inactive.");
        } else {
            vTaskDelay(1000 / portTICK_PERIOD_MS);
        }
    }
}

void setup() {
    Serial.begin(9600);
    delay(500);

    setup_wifi();
    espClient.setInsecure();
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);

    xTaskCreatePinnedToCore(
        mqttTask,
        "MQTT Task",
        10000,
        NULL,
        0,
        &mqttTaskHandle,
        0
    );

    xTaskCreatePinnedToCore(
        sensorTask,
        "Sensor Task",
        10000,
        NULL,
        1,
        &sensorTaskHandle,
        1
    );

    xTaskCreatePinnedToCore(
        hourModeTask,
        "Hour Mode Task",
        10000,
        NULL,
        2,
        &hourModeTaskHandle,
        0
    );
}

void loop() {}