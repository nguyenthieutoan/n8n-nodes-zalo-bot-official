# n8n Zalo Bot Community Node

Developed with love by **[Jay Nguyen (Nguyễn Thiệu Toàn)](https://nguyenthieutoan.com)**, a **[Verified n8n Creator](https://n8n.io/creators/nguyenthieutoan)** & CEO/Founder of **[GenStaff](https://genstaff.net)**.

**Connect with me:**
[LinkedIn](https://www.linkedin.com/in/nguyenthieutoan) | [Facebook](https://www.facebook.com/nguyenthieutoan) | [Website](https://nguyenthieutoan.com) | [Email](mailto:me@nguyenthieutoan.com)

---

This is an n8n community node that integrates the **Zalo Bot Platform** into your n8n workflows. It allows you to send text messages (supporting rich text formats), photos, stickers, voice messages, chat actions, retrieve bot information, and trigger workflows dynamically on real-time webhook events from Zalo.

---

## Features

- **Zalo Bot Action Node**:
  - **Message Resource**:
    - `Send Text Message`: Supports Markdown or HTML parse modes for rich text formatting.
    - `Send Photo`: Send photos via public URLs with custom captions.
    - `Send Sticker`: Send expressive stickers using official Zalo Sticker IDs.
    - `Send Voice Message`: Send audio recordings (.aac format) to 1-1 user chats.
    - `Send Chat Action`: Simulates user action indicators (e.g., `typing`).
  - **Bot Info Resource**:
    - `Get Info`: Validates credentials and fetches details about the configured Bot.
- **Zalo Bot Trigger Node (Webhook)**:
  - Automates webhook registration and lifecycle events.
  - Implements SHA256 webhook security validation checks (`x-bot-api-secret-token`).
  - Implements auto-healing URL comparisons.
- **Zero Runtime Dependencies**: Strict packaging conformance prevents bundle bloat or runtime collision.

---

## Installation

### For Self-Hosted n8n Instance
In your self-hosted n8n instance directory, run:
```bash
npm install n8n-nodes-zalo-bot-official
```
Or use the **Community Nodes** menu in your n8n settings dashboard:
1. Go to **Settings** > **Community Nodes**.
2. Click **Install a Node**.
3. Type: `n8n-nodes-zalo-bot-official`
4. Accept and install.

---

## Credentials

To authenticate your node, you will need a **Bot Token** from the Zalo Bot Manager.
- **Bot Token**: A long-lived token structured as `{bot_id}:{secret_key}`.

---

## Local Development & Compilation

### Requirements
- Node.js `v22.22.0+`
- `npm`

### Steps
1. Clone this repository:
   ```bash
   git clone https://github.com/nguyenthieutoan/n8n-nodes-zalo-bot-official.git
   cd n8n-nodes-zalo-bot-official
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the node:
   ```bash
   npm run build
   ```

---

## Local Verification using Docker Compose

A `compose.yaml` file is provided in the repository to mount your compiled output directory directly into a local n8n instance for testing:

1. Compile your TS files:
   ```bash
   npm run build
   ```
2. Launch n8n using Docker Compose:
   ```bash
   docker compose up -d
   ```
3. Open `http://localhost:5678` in your browser, configure your credentials, and start adding Zalo Bot nodes to your workflows!

---

## License
[MIT](LICENSE)
