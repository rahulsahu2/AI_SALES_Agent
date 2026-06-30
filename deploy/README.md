# Deploying VoiceFlow AI on a Virtual Machine (EC2, Droplet, GCP VM)

This guide walks you through the step-by-step process of deploying VoiceFlow AI in a production environment on a single or multi-VM setup.

---

## 1. Firewall and Network Configurations (Security Groups)

Ensure the following ports are open in your Cloud Provider's Firewall/Security Groups:

| Port Range | Protocol | Service | Description |
| :--- | :--- | :--- | :--- |
| **80** | TCP | HTTP | Redirects to HTTPS |
| **443** | TCP | HTTPS | Nginx SSL Frontend / REST / WebSockets |
| **5060** | UDP/TCP | SIP signaling | FreeSWITCH inbound connection signaling |
| **16384 - 32768** | UDP | Audio RTP | FreeSWITCH media audio channels |
| **7880** | TCP | LiveKit HTTP | LiveKit API server |
| **7881** | TCP | LiveKit WS | LiveKit client WebSockets signal |
| **50000 - 60000** | UDP | LiveKit WebRTC | LiveKit WebRTC media streams |

---

## 2. Server Installation Requirements

SSH into your VM and run the following command to update packages and install **Docker** and **Docker Compose**:

```bash
# Update Ubuntu repositories
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y docker.io

# Install Docker Compose v2
sudo apt-get install -y docker-compose-plugin

# Verify installations
docker --version
docker compose version
```

---

## 3. Clone and Setup Environment Settings

1. Clone your project repository into the VM:
   ```bash
   git clone <your-repo-link> /var/www/voiceflow-ai
   cd /var/www/voiceflow-ai
   ```

2. Copy the production environment settings file:
   ```bash
   cp deploy/.env.production backend/.env
   ```

3. Open `backend/.env` and update the parameters:
   - Change `SECRET_KEY` and `ENCRYPTION_KEY` using secure hex outputs.
   - Configure PostgreSQL with a strong `POSTGRES_PASSWORD`.
   - Update `BACKEND_CORS_ORIGINS` to point to your live domains (e.g. `https://app.yourdomain.com`).
   - Add your live ElevenLabs, Deepgram, and Twilio credentials.

---

## 4. Install SSL Certificates (Certbot)

Install Nginx and Certbot to obtain free SSL certificates from Let's Encrypt:

```bash
# Install Nginx and Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Obtain SSL certificates for your domains
sudo certbot certonly --nginx -d app.yourdomain.com -d api.yourdomain.com
```

---

## 5. Map Nginx Reverse Proxy Config

1. Copy the Nginx proxy settings configuration:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/voiceflow
   ```

2. Open `/etc/nginx/sites-available/voiceflow` and replace `app.voiceflow.ai` and `api.voiceflow.ai` with your live domains.

3. Enable the config and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/voiceflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 6. Build and Start the Application Containers

Start the production docker-compose stack:

```bash
# Start Postgres, Redis, API, Workers, LiveKit Agents, and UI
docker compose -f docker-compose.yml up --build -d
```

Check the status of running containers:
```bash
docker compose ps
```

Verify backend Celery worker and LiveKit agent execution logs:
```bash
docker compose logs -f celery-worker
docker compose logs -f livekit-agent
```
