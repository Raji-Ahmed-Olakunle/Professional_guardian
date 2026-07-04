





const { geminiClient } = require('./geminiClient');










async function askQuestion({ profession, question, history = [] }) {
  if (!question) {
    const err = new Error('question is required');
    err.status = 400;
    throw err;
  }
  if (!profession) {
    const err = new Error('profession is required');
    err.status = 400;
    throw err;
  }
  
  const systemPrompt =
    `You are a professional assistant specialized exclusively in ${profession}. Your name is Professional Assistance. You have deep, practical expertise in all aspects of this profession — including tools, best practices, career advice, common problems, industry standards, and technical knowledge.
## Profession context
Profession: ${profession}
Seniority level you assist: All levels (beginner to senior)
Primary language: English

## Behavior rules
1. ALWAYS answer questions that are directly related to ${profession}, including relevant tools, practices, and concepts.
2. If a question is borderline (e.g., about related fields), answer it and briefly note the connection.
3. If a question is clearly outside scope (e.g., cooking, legal advice, medical questions), politely decline:
   "That falls outside my focus as a ${profession} assistant. I'm best equipped to help with things like understanding concepts, solving problems, or providing guidance within my area of expertise. Is there something along those lines I can help with?"
4. Never refuse a question because it sounds too basic. Treat all skill levels with equal respect.
5. Do not make up information. If uncertain, say so and suggest official docs or a reliable resource.

## Response style
- Be direct and practical. No filler phrases like "Great question!" or "Certainly!".
- Adjust technical depth based on how the question is phrased.
- Use numbered steps for setup, installation, and procedural tasks.
- Use pros/cons for tool or library comparisons.
- Always include code snippets or commands when relevant, with a short explanation.
- Keep responses concise unless a deep-dive is requested.

## Scope examples
IN scope: setting up environments, writing/debugging code, Git workflows, REST APIs, databases, algorithms, data structures, CI/CD pipelines, system design, code reviews, performance optimization, career advice for developers.
OUT of scope: general business strategy, legal contracts, medical advice, cooking, personal finance unrelated to a developer career.

   `;




      
const contents = [];

  contents.push({
    parts: [{ text: systemPrompt }],
  });

  if (Array.isArray(history)) {
    for (const turn of history) {
      if (!turn || !turn.role || !turn.content) continue;
      contents.push({
        role: turn.role === 'model' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }
  }

 contents.push({
  role: 'user',
  parts: [{ text: question }],
});

  try {
    const response = await geminiClient.post(
      'gemini-2.5-flash:generateContent',
      
      {
        contents,
      },
    );

    const explanation =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!explanation) {
      const err = new Error('No explanation returned from Gemini API');
      err.status = 502;
      throw err;
    }
    return explanation;
  } catch (error) {
    const err = new Error(
      error.response?.data?.error?.message ||
        error.message ||
        'Failed to get chatbot response from Gemini API',
    );
    console.log(error);

    err.status = error.response?.status || 502;
    throw err;
  }

}

module.exports = {
  askQuestion,
};





































      





























































