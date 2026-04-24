require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:5000',
    'X-Title': 'MyTranscriber',
  },
});

client.chat.completions.create({
  model: 'meta-llama/llama-3.3-70b-instruct:free',
  messages: [{ role: 'user', content: 'Say hello' }],
  max_tokens: 50,
})
.then(r => console.log('SUCCESS:', r.choices[0].message.content))
.catch(e => console.log('ERROR:', e.status, e.message));