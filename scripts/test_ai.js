const { createChatCompletion, isOmnirouteConfigured } = require('../lib/ai/omniroute');

async function testAI() {
  console.log('Testing Omniroute configuration and connection...');
  console.log('Is configured:', isOmnirouteConfigured());

  try {
    const res = await createChatCompletion({
      messages: [
        { role: 'user', content: 'Напиши приветствие на русском языке для студента курса Python.' }
      ],
      maxTokens: 100
    });
    console.log('AI Response SUCCESS:', res.content);
  } catch (err) {
    console.error('AI Response ERROR:', err);
  }
}

testAI();
