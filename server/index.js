const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Data file path
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Load messages from file
async function loadMessages() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save messages to file
async function saveMessages(messages) {
  try {
    await ensureDataDir();
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving messages:', err);
  }
}

// API Routes

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await loadMessages();
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get a specific message by ID
app.get('/api/messages/:id', async (req, res) => {
  try {
    const messages = await loadMessages();
    const message = messages.find(m => m.id === req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (err) {
    console.error('Error fetching message:', err);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Create a new message (webhook endpoint)
app.post('/api/webhook/message', async (req, res) => {
  try {
    const { content, source } = req.body;
    
    // Validate required fields
    if (!content || !source) {
      return res.status(400).json({ error: 'Content and source are required' });
    }
    
    // Generate a message object but don't save it
    // The backend will handle saving to the database
    const messageReceived = {
      id: uuidv4(), // Generate an ID for reference
      subject: `New message from ${source}`,
      content,
      timestamp: new Date().toISOString(),
      source,
      received: true
    };
    
    // Just return success response
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received successfully',
      reference_id: messageReceived.id
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Mark a message as read
app.patch('/api/messages/:id/read', async (req, res) => {
  try {
    const messages = await loadMessages();
    const messageIndex = messages.findIndex(m => m.id === req.params.id);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    messages[messageIndex].is_read = true;
    
    await saveMessages(messages);
    
    res.json(messages[messageIndex]);
  } catch (err) {
    console.error('Error updating message:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    let messages = await loadMessages();
    const messageIndex = messages.findIndex(m => m.id === req.params.id);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    messages = messages.filter(m => m.id !== req.params.id);
    
    await saveMessages(messages);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
