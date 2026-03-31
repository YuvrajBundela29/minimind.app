async function testChat() {
  const url = 'https://xurvlgchijiahipbivzl.supabase.co/functions/v1/chat';
  const token = 'fake-jwt'; // We deployed with --no-verify-jwt, so fake token might pass the gateway. But in the code we do supabase.auth.getClaims. BUT wait, in chat we do NOT require valid token for guest mode!!! 
  // Let's test as guest!
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "Hello",
        mode: "beginner",
        language: "en",
        type: "explain"
      })
    });
    const status = res.status;
    let text;
    try {
      text = await res.json();
    } catch {
      text = await res.text();
    }
    console.log("Chat Response:", status, JSON.stringify(text, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testChat();
