// ============================================================================
// Spectra — ESP32-CAM Rod & Pipe Inspection Firmware
// Board: AI-Thinker ESP32-CAM (OV2640)
// ============================================================================
//
// Endpoints served:
//   Port 80  /              → status page (JSON)
//   Port 81  /stream        → MJPEG video stream
//   Port 81  /capture       → single JPEG frame
//
// Matches the Spectra backend proxy expectations in server.ts:
//   ESP32_CAM_URL = "http://<this-ip>:81/stream"
// ============================================================================

#include "esp_camera.h"
#include "esp_http_server.h"
#include <WiFi.h>

// ─── WiFi Credentials ───────────────────────────────────────────────────────
// Change these to match your network
const char* WIFI_SSID     = "Mekesh";
const char* WIFI_PASSWORD = "12345678";

// ─── Hardware Pin Definitions (AI-Thinker ESP32-CAM) ─────────────────────────
// Camera
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ─── HTTP Servers ───────────────────────────────────────────────────────────
httpd_handle_t controlServer = NULL;  // port 80
httpd_handle_t streamServer  = NULL;  // port 81

// MJPEG stream boundary
#define PART_BOUNDARY "frame"
static const char* STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* STREAM_BOUNDARY =
    "\r\n--" PART_BOUNDARY "\r\n";
static const char* STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ─── Forward Declarations ───────────────────────────────────────────────────
void initCamera();
void connectWiFi();
void startControlServer();
void startStreamServer();

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════════
void setup() {
    Serial.begin(115200);
    Serial.println();
    Serial.println("=================================");
    Serial.println(" Spectra ESP32-CAM v1.1");
    Serial.println("=================================");

    initCamera();
    connectWiFi();
    startControlServer();
    startStreamServer();

    Serial.println();
    Serial.println("[READY] Spectra hardware online");
    Serial.printf("[STREAM]  http://%s:81/stream\n", WiFi.localIP().toString().c_str());
    Serial.printf("[CAPTURE] http://%s:81/capture\n", WiFi.localIP().toString().c_str());
    Serial.printf("[STATUS]  http://%s/\n", WiFi.localIP().toString().c_str());
    Serial.println("=================================");
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════════════════
void loop() {
    // Reconnect WiFi if connection drops
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WARN] WiFi disconnected — reconnecting...");
        connectWiFi();
    }
    delay(10000);
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMERA INIT
// ═══════════════════════════════════════════════════════════════════════════
void initCamera() {
    Serial.println("[INIT] Camera...");

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = Y2_GPIO_NUM;
    config.pin_d1       = Y3_GPIO_NUM;
    config.pin_d2       = Y4_GPIO_NUM;
    config.pin_d3       = Y5_GPIO_NUM;
    config.pin_d4       = Y6_GPIO_NUM;
    config.pin_d5       = Y7_GPIO_NUM;
    config.pin_d6       = Y8_GPIO_NUM;
    config.pin_d7       = Y9_GPIO_NUM;
    config.pin_xclk     = XCLK_GPIO_NUM;
    config.pin_pclk     = PCLK_GPIO_NUM;
    config.pin_vsync    = VSYNC_GPIO_NUM;
    config.pin_href     = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // Use PSRAM if available for higher resolution
    if (psramFound()) {
        config.frame_size   = FRAMESIZE_VGA;    // 640×480 — optimal for inspection
        config.jpeg_quality = 12;               // 0-63, lower = higher quality
        config.fb_count     = 2;                // double-buffer for smooth streaming
        Serial.println("[INIT] PSRAM found — VGA, dual framebuffer");
    } else {
        config.frame_size   = FRAMESIZE_QVGA;   // 320×240 fallback
        config.jpeg_quality = 15;
        config.fb_count     = 1;
        Serial.println("[INIT] No PSRAM — QVGA, single framebuffer");
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[ERROR] Camera init failed: 0x%x\n", err);
        ESP.restart();
    }

    // Tune sensor settings for industrial inspection
    sensor_t* s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 1);     // slight brightness boost
        s->set_contrast(s, 1);       // enhance edge contrast
        s->set_saturation(s, 0);     // neutral colour
        s->set_whitebal(s, 1);       // auto white balance on
        s->set_awb_gain(s, 1);       // AWB gain on
        s->set_exposure_ctrl(s, 1);  // auto exposure on
        s->set_gain_ctrl(s, 1);      // auto gain on
    }

    Serial.println("[INIT] Camera OK");
}

// ═══════════════════════════════════════════════════════════════════════════
//  WIFI
// ═══════════════════════════════════════════════════════════════════════════
void connectWiFi() {
    Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" connected!");
        Serial.printf("[WIFI] IP: %s  RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println(" FAILED!");
        Serial.println("[ERROR] WiFi connection failed — restarting in 5s");
        delay(5000);
        ESP.restart();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  HTTP HANDLERS — Port 80 (Control)
// ═══════════════════════════════════════════════════════════════════════════

// GET / — device status
static esp_err_t statusHandler(httpd_req_t* req) {
    char json[192];
    snprintf(json, sizeof(json),
        "{\"device\":\"spectra-esp32-cam\","
        "\"version\":\"1.1\","
        "\"ip\":\"%s\","
        "\"rssi\":%d,"
        "\"uptime\":%lu}",
        WiFi.localIP().toString().c_str(),
        WiFi.RSSI(),
        millis() / 1000
    );
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, json, strlen(json));
}

// ═══════════════════════════════════════════════════════════════════════════
//  HTTP HANDLERS — Port 81 (Stream)
// ═══════════════════════════════════════════════════════════════════════════

// GET /capture — single JPEG frame
static esp_err_t captureHandler(httpd_req_t* req) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("[ERROR] Frame capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition",
                       "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    esp_err_t res = httpd_resp_send(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// GET /stream — continuous MJPEG stream
static esp_err_t streamHandler(httpd_req_t* req) {
    esp_err_t res = ESP_OK;
    char partBuf[64];

    res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
    if (res != ESP_OK) return res;

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    while (true) {
        camera_fb_t* fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("[ERROR] Stream frame failed");
            res = ESP_FAIL;
            break;
        }

        size_t hlen = snprintf(partBuf, sizeof(partBuf),
                               STREAM_PART, fb->len);

        res = httpd_resp_send_chunk(req, STREAM_BOUNDARY,
                                    strlen(STREAM_BOUNDARY));
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, partBuf, hlen);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, (const char*)fb->buf,
                                        fb->len);
        }

        esp_camera_fb_return(fb);

        if (res != ESP_OK) {
            // Client disconnected
            break;
        }
    }
    return res;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVER START
// ═══════════════════════════════════════════════════════════════════════════

void startControlServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.max_uri_handlers = 1;

    Serial.println("[HTTP] Starting control server on port 80...");
    if (httpd_start(&controlServer, &config) == ESP_OK) {
        // GET /
        httpd_uri_t statusUri = {
            .uri      = "/",
            .method   = HTTP_GET,
            .handler  = statusHandler,
            .user_ctx = NULL
        };
        httpd_register_uri_handler(controlServer, &statusUri);

        Serial.println("[HTTP] Control server OK");
    } else {
        Serial.println("[ERROR] Control server failed to start");
    }
}

void startStreamServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port  = 81;
    config.ctrl_port    = 32769;  // different from control server
    config.max_uri_handlers = 2;

    Serial.println("[HTTP] Starting stream server on port 81...");
    if (httpd_start(&streamServer, &config) == ESP_OK) {
        // GET /stream
        httpd_uri_t streamUri = {
            .uri      = "/stream",
            .method   = HTTP_GET,
            .handler  = streamHandler,
            .user_ctx = NULL
        };
        httpd_register_uri_handler(streamServer, &streamUri);

        // GET /capture
        httpd_uri_t captureUri = {
            .uri      = "/capture",
            .method   = HTTP_GET,
            .handler  = captureHandler,
            .user_ctx = NULL
        };
        httpd_register_uri_handler(streamServer, &captureUri);

        Serial.println("[HTTP] Stream server OK");
    } else {
        Serial.println("[ERROR] Stream server failed to start");
    }
}
