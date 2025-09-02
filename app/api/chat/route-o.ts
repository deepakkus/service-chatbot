import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mysql from "mysql2/promise";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);

let db: mysql.Pool | null = null;

async function getDB() {
  if (!db) {
    db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }
  return db;
}

export async function POST(req: NextRequest) {
  try {
    const { query, userId } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const db = await getDB();
    let context = "";

    // 1️⃣ First check FAQs using FULLTEXT search
    const [faqRows] = await db.query(
      `SELECT answer, 
              MATCH(question) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance 
       FROM faqs 
       WHERE MATCH(question) AGAINST (? IN NATURAL LANGUAGE MODE)
       ORDER BY relevance DESC
       LIMIT 1`,
      [query, query]
    );

    if ((faqRows as any[]).length > 0) {
      context = `FAQ Answer: ${(faqRows as any[])[0].answer}`;
    } 
    // 2️⃣ If no FAQ match, check order intent
    else if (/order/i.test(query)) {
      const [rows] = await db.query(
        "SELECT id, status, total FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if ((rows as any[]).length > 0) {
        const order = (rows as any[])[0];
        context = `The user's latest order is #${order.id}, status: "${order.status}", total: $${order.total}.`;
      } else {
        context = "The user has no recent orders.";
      }
    } 
    // 3️⃣ Product intent
    else if (/product|shoe|bag|tshirt/i.test(query)) {
      const [rows] = await db.query(
        "SELECT name, price FROM products ORDER BY created_at DESC LIMIT 5"
      );
      const products = (rows as any[]).map(p => `${p.name} - $${p.price}`).join("\n");
      context = `Latest products:\n${products}`;
    } 
    // 4️⃣ General fallback
    else {
      context = "General ecommerce info: shipping takes 3-5 days, returns within 7 days.";
    }

    // 🔹 Generate response with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
User asked: "${query}"
Context from database: ${context}

Answer the user in a friendly ecommerce support style.
`;

    const response = await model.generateContent(prompt);
    const answer = response.response.text().trim();

    return NextResponse.json({ answer, context });
  } catch (err) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
