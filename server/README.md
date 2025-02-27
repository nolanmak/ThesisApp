# Earnings Manager Server

This is the backend server for the Earnings Manager application, providing API endpoints for messages and webhook functionality.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

The server will run on port 3001 by default (configurable via PORT environment variable).

## Webhook API

### Receive a message via webhook

The webhook endpoint receives messages but does not store them locally. It validates the request and returns a success response. The actual backend system will handle storing the messages in a database.

To send a message to the webhook, make a POST request to:

```
POST http://localhost:3001/api/webhook/message
```

Request body (JSON):

```json
{
  "content": "Message content goes here...",
  "source": "source-identifier"
}
```

Both `content` and `source` are required fields.

### Response

The webhook will respond with:

```json
{
  "success": true,
  "message": "Webhook received successfully",
  "reference_id": "generated-uuid"
}
```

### Example using curl

```bash
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "content": "AAPL earnings report is now available.",
    "source": "earnings-bot"
  }'
```

### Example using Python

```python
import requests

url = "http://localhost:3001/api/webhook/message"
data = {
    "content": "AAPL earnings report is now available.",
    "source": "earnings-bot"
}

response = requests.post(url, json=data)
print(response.json())
```

## API Endpoints

- `GET /api/messages` - Get all messages (fetched from the backend database)
- `GET /api/messages/:id` - Get a specific message
- `POST /api/webhook/message` - Receive a message via webhook (validates only, doesn't store)
- `PATCH /api/messages/:id/read` - Mark a message as read
- `DELETE /api/messages/:id` - Delete a message

## Integration Flow

1. External system sends a message to the webhook endpoint
2. Webhook validates the message format and returns a success response
3. The backend system handles storing the message in a database
4. The Messages component in the frontend fetches messages from the database via the API
