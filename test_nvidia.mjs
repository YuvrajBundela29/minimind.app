// The user's API call specifies model "deepseek-ai/deepseek-v3.2"
// Let's try that exact model string
const API_KEY = "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";

const models = ["deepseek-ai/deepseek-v3.2", "nvidia/llama-3.3-nemotron-super-49b-v1", "meta/llama-3.3-70b-instruct", "qwen/qwen3-235b-a22b"];

async function testModel(model) {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{role: "user", content: "Say hello in one word"}],
      max_tokens: 50,
      temperature: 1,
      top_p: 0.95,
      stream: false,
    })
  });
  const text = await res.text();
  console.log(`[${model}] Status:${res.status} Body:${text.substring(0, 200)}`);
}

for (const m of models) {
  await testModel(m);
}
