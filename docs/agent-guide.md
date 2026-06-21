# Zalo Bot — Agent Guide

> This document helps AI Agents understand and use this node when building n8n workflows.

## Overview

| Property | Value |
|----------|-------|
| **Package** | `n8n-nodes-zalo-bot-official` |
| **Node Type** | Regular Node + Trigger Node |
| **Connection Type** | Input/Output: `Main` |
| **Credential** | Zalo Bot API |
| **n8n displayName** | `Zalo Bot` / `Zalo Bot Trigger` |

## What This Node Does

Integrates with the Zalo Bot Platform to send and receive messages. Includes:
- **Zalo Bot** (Regular Node): Send messages, manage users, interact with the Zalo Bot API
- **Zalo Bot Trigger** (Trigger Node): Receive incoming messages and events via webhook

## Credentials Setup

1. Create a Zalo Bot at [Zalo Developers](https://developers.zalo.me/)
2. Get your Bot API credentials (Access Token, Secret Key)
3. In n8n: Settings → Credentials → Add credential → Select **"Zalo Bot API"**
4. Configure the webhook URL in Zalo Developer console to point to your n8n trigger URL

## Connection Types

| Direction | Type | Description |
|-----------|------|-------------|
| Input | `Main` | Receives items to process (send messages, etc.) |
| Output | `Main` | Returns API responses / incoming messages |

## How to Use in Workflows

### Pattern 1: Auto-Reply Chatbot
```
Zalo Bot Trigger → AI Agent → Zalo Bot (Send Message)
```

### Pattern 2: Broadcast Messages
```
Schedule Trigger → Get Contacts → Zalo Bot (Send Message)
```

## Gotchas & Known Issues

- **Webhook Setup**: The Zalo Bot Trigger requires a publicly accessible URL. Use ngrok or deploy n8n publicly.
- **Token Refresh**: Zalo access tokens expire. Ensure your credential handles refresh.
- **Vietnamese API**: Zalo is primarily used in Vietnam; API docs and error messages may be in Vietnamese.
