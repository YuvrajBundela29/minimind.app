const fetch = require('node-fetch');

async function testPayment() {
  const url = 'https://xurvlgchijiahipbivzl.supabase.co/functions/v1/payment';
  
  // Note: For create_order we need a valid JWT token of a user. But let's just send without one to see if we get 'Unauthorized' (meaning the function runs perfectly up to the auth check)
  const res = await fetch(url, {
    method: 'OPTIONS', // Just check if it's there
  });
  console.log("OPTIONS Status:", res.status);
  
  const token = 'fake-jwt';
  const res2 = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'create_order', planId: 'plus', planType: 'monthly' })
  });
  const text = await res2.text();
  console.log("POST Status:", res2.status, "Body:", text);
}

testPayment();
