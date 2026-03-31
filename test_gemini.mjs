const API_KEY = "AIzaSyASVaX8qZkGlfkt1xWneDxvrX2um67fMZw";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
async function test() {
  const res = await fetch(url);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
test();
