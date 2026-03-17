const rateLimitMap = {};
const DAILY_LIMIT = 10;

function getRateLimit(ip) {
  const today = new Date().toDateString();
  if (!rateLimitMap[ip] || rateLimitMap[ip].day !== today) {
    rateLimitMap[ip] = { count: 0, day: today };
  }
  return rateLimitMap[ip];
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST,OPTIONS" }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const ip = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  const rl = getRateLimit(ip);
  if (rl.count >= DAILY_LIMIT) {
    return { statusCode: 429, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify({ error: { message: "일일 사용 한도(" + DAILY_LIMIT + "회)를 초과했습니다. 내일 다시 이용해주세요." } }) };
  }
  rl.count++;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify({ error: { message: "서버에 API Key가 설정되지 않았습니다." } }) };
  }
  try {
    const requestBody = JSON.parse(event.body);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    return { statusCode: response.status, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify({ error: { message: "서버 오류: " + err.message } }) };
  }
};
