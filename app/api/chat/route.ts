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

// Intent recognition function (only if enhanced tables exist)
async function detectIntent(query: string, db: mysql.Pool) {
  try {
    const [patterns] = await db.query(
      "SELECT intent_name, patterns, responses, context_type, priority FROM intent_patterns WHERE is_active = TRUE ORDER BY priority ASC"
    );
    
    const patternsList = patterns as Array<{
      intent_name: string;
      patterns: string;
      responses: string;
      context_type: string;
      priority: number;
    }>;
    
    for (const pattern of patternsList) {
      const regexPatterns = pattern.patterns.split('|');
      for (const regex of regexPatterns) {
        if (new RegExp(regex, 'i').test(query)) {
          return {
            intent: pattern.intent_name,
            response: pattern.responses,
            contextType: pattern.context_type
          };
        }
      }
    }
    
    return { intent: 'general', response: null, contextType: 'general' };
  } catch {
    // Fallback to simple keyword detection
    return detectSimpleIntent(query);
  }
}

// Simple intent detection for when enhanced tables don't exist
function detectSimpleIntent(query: string) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('job') || lowerQuery.includes('career') || lowerQuery.includes('position') || lowerQuery.includes('hiring')) {
    return { intent: 'job_search', response: null, contextType: 'job' };
  }
  
  if (lowerQuery.includes('service') || lowerQuery.includes('development') || lowerQuery.includes('app') || lowerQuery.includes('website')) {
    return { intent: 'service_inquiry', response: null, contextType: 'service' };
  }
  
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('quote') || lowerQuery.includes('how much')) {
    return { intent: 'service_quote', response: null, contextType: 'service' };
  }
  
  return { intent: 'general', response: null, contextType: 'general' };
}

// Service-related query handling
async function handleServiceQuery(query: string, db: mysql.Pool) {
  try {
    // Check if software_services table exists
    const [services] = await db.query("SHOW TABLES LIKE 'software_services'");
    if ((services as Array<{ [key: string]: string }>).length > 0) {
      // Enhanced service handling
      const serviceKeywords = {
        'web': 'Web Development',
        'mobile': 'Mobile Development', 
        'app': 'Mobile Development',
        'cloud': 'Cloud Services',
        'aws': 'Cloud Services',
        'devops': 'DevOps & CI/CD',
        'data': 'Data Analytics',
        'ai': 'AI & Machine Learning',
        'ml': 'AI & Machine Learning',
        'security': 'Cybersecurity',
        'ui': 'UI/UX Design',
        'ux': 'UI/UX Design'
      };

      let serviceCategory = null;
      for (const [keyword, category] of Object.entries(serviceKeywords)) {
        if (query.toLowerCase().includes(keyword)) {
          serviceCategory = category;
          break;
        }
      }

      if (serviceCategory) {
        const [serviceData] = await db.query(
          `SELECT s.name, s.description, s.base_price, s.estimated_duration, s.technologies
           FROM software_services s
           JOIN service_categories c ON s.category_id = c.id
           WHERE c.name = ? AND s.is_active = TRUE
           LIMIT 3`,
          [serviceCategory]
        );
        
        if ((serviceData as Array<{
          name: string;
          description: string;
          base_price: number;
          estimated_duration: string;
          technologies: string;
        }>).length > 0) {
          const serviceList = (serviceData as Array<{
            name: string;
            description: string;
            base_price: number;
            estimated_duration: string;
            technologies: string;
          }>).map(s => 
            `• ${s.name}: ${s.description} (Starting at $${s.base_price}, ${s.estimated_duration})`
          ).join('\n');
          
          return `Here are our ${serviceCategory} services:\n${serviceList}\n\nWould you like a quote for any of these services?`;
        }
      }

      // General service inquiry
      const [categories] = await db.query(
        "SELECT name, description FROM service_categories WHERE is_active = TRUE LIMIT 5"
      );
      
      const categoryList = (categories as Array<{ name: string; description: string }>).map(c => `• ${c.name}: ${c.description}`).join('\n');
      
      return `We offer the following software development services:\n${categoryList}\n\nWhat type of project do you have in mind? I can help you get a quote.`;
    }
  } catch {
    console.log("Enhanced service tables not available, using fallback");
  }
  
  // Fallback response
  return "We offer comprehensive software development services including web development, mobile apps, cloud services, and more. What type of project are you looking for? I can help you get a quote.";
}

// Job search query handling
async function handleJobQuery(query: string, db: mysql.Pool) {
  try {
    // Check if job_postings table exists
    const [jobs] = await db.query("SHOW TABLES LIKE 'job_postings'");
    if ((jobs as Array<{ [key: string]: string }>).length > 0) {
      // Enhanced job handling
      const jobKeywords = {
        'frontend': 'Software Development',
        'backend': 'Software Development',
        'fullstack': 'Software Development',
        'data scientist': 'Data Science',
        'devops': 'DevOps Engineering',
        'product manager': 'Product Management',
        'designer': 'UI/UX Design',
        'qa': 'Quality Assurance',
        'support': 'Technical Support',
        'entry': 'entry',
        'junior': 'junior',
        'senior': 'senior'
      };

      let jobCategory = null;
      let experienceLevel = null;
      
      for (const [keyword, category] of Object.entries(jobKeywords)) {
        if (query.toLowerCase().includes(keyword)) {
          if (['entry', 'junior', 'senior'].includes(category)) {
            experienceLevel = category;
          } else {
            jobCategory = category;
          }
        }
      }

      let whereClause = "WHERE j.is_active = TRUE";
      const params: (string | number)[] = [];
      
      if (jobCategory) {
        whereClause += " AND c.name = ?";
        params.push(jobCategory);
      }
      
      if (experienceLevel) {
        whereClause += " AND j.experience_level = ?";
        params.push(experienceLevel);
      }

      const [jobData] = await db.query(
        `SELECT j.title, j.company_name, j.location, j.job_type, j.salary_range, j.description
         FROM job_postings j
         JOIN job_categories c ON j.category_id = c.id
         ${whereClause}
         ORDER BY j.created_at DESC
         LIMIT 5`,
        params
      );

      if ((jobData as Array<{
        title: string;
        company_name: string;
        location: string;
        job_type: string;
        salary_range: string;
        description: string;
      }>).length > 0) {
        const jobList = (jobData as Array<{
          title: string;
          company_name: string;
          location: string;
          job_type: string;
          salary_range: string;
          description: string;
        }>).map(j => 
          `• ${j.title} at ${j.company_name} (${j.location})\n  ${j.job_type} • ${j.salary_range}\n  ${j.description.substring(0, 100)}...`
        ).join('\n\n');
        
        return `Here are some job opportunities that match your search:\n\n${jobList}\n\nWould you like to apply for any of these positions or get more details?`;
      }
    }
  } catch {
    console.log("Enhanced job tables not available, using fallback");
  }
  
  // Fallback response
  return "We have great job opportunities in software development, data science, DevOps, and more! What type of role are you looking for? I can help you find the perfect position.";
}

// Pricing and quote handling
async function handlePricingQuery(query: string, db: mysql.Pool) {
  try {
    // Check if software_services table exists
    const [services] = await db.query("SHOW TABLES LIKE 'software_services'");
    if ((services as Array<{ [key: string]: string }>).length > 0) {
      if (query.toLowerCase().includes('website')) {
        const [websiteServices] = await db.query(
          "SELECT name, base_price, estimated_duration FROM software_services WHERE name LIKE '%website%' AND is_active = TRUE"
        );
        
        if ((websiteServices as Array<{
          name: string;
          base_price: number;
          estimated_duration: string;
        }>).length > 0) {
          const pricing = (websiteServices as Array<{
            name: string;
            base_price: number;
            estimated_duration: string;
          }>).map(s => 
            `• ${s.name}: Starting at $${s.base_price} (${s.estimated_duration})`
          ).join('\n');
          
          return `Website Development Pricing:\n${pricing}\n\nFor a custom quote based on your specific requirements, please tell me more about your project.`;
        }
      }

      // General pricing info
      const [allServices] = await db.query(
        "SELECT name, base_price, pricing_type, estimated_duration FROM software_services WHERE is_active = TRUE ORDER BY base_price ASC LIMIT 5"
      );
      
      const pricingList = (allServices as Array<{
        name: string;
        base_price: number;
        pricing_type: string;
        estimated_duration: string;
      }>).map(s => 
        `• ${s.name}: ${s.pricing_type} pricing starting at $${s.base_price} (${s.estimated_duration})`
      ).join('\n');
      
      return `Our Service Pricing:\n${pricingList}\n\nWe offer flexible pricing models including hourly, fixed, and subscription plans. For a custom quote, please describe your project requirements.`;
    }
  } catch {
    console.log("Enhanced service tables not available, using fallback");
  }
  
  // Fallback response
  return "Our pricing varies based on project complexity and requirements. Custom websites typically start at $2,500, mobile apps from $5,000, and enterprise solutions from $15,000. For a detailed quote, please tell me more about your project.";
}

export async function POST(req: NextRequest) {
  try {
    const { query, userId, sessionId } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const db = await getDB();
    
    // 1. Intent Detection
    const intent = await detectIntent(query, db);
    
    // 2. Context-specific handling
    let context = "";
    let response = "";
    
    if (intent.intent === 'service_quote' || intent.intent === 'service_inquiry') {
      response = await handleServiceQuery(query, db);
    } else if (intent.intent === 'job_search') {
      response = await handleJobQuery(query, db);
    } else if (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost') || query.toLowerCase().includes('quote')) {
      response = await handlePricingQuery(query, db);
    } else {
      // 3. Fallback to FAQ search
      try {
        const [faqRows] = await db.query(
          `SELECT answer, 
                  MATCH(question) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance 
           FROM faqs 
           WHERE MATCH(question) AGAINST (? IN NATURAL LANGUAGE MODE)
           ORDER BY relevance DESC
           LIMIT 1`,
          [query, query]
        );

        if ((faqRows as Array<{ answer: string; relevance: number }>).length > 0) {
          response = (faqRows as Array<{ answer: string; relevance: number }>)[0].answer;
        } else {
          // 4. Generate AI response with context
          let contextInfo = "We offer software development services and job placement assistance.";
          
          try {
            const [recentServices] = await db.query(
              "SELECT name, description FROM software_services WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 3"
            );
            
            const [recentJobs] = await db.query(
              "SELECT title, company_name FROM job_postings WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 5"
            );
            
            if ((recentServices as Array<{ name: string; description: string }>).length > 0 || (recentJobs as Array<{ title: string; company_name: string }>).length > 0) {
              contextInfo = `Available services: ${(recentServices as Array<{ name: string; description: string }>).map(s => s.name).join(', ')}. Recent job openings: ${(recentJobs as Array<{ title: string; company_name: string }>).map(j => j.title).join(', ')}.`;
            }
          } catch {
            console.log("Could not fetch enhanced context");
          }
          
          context = contextInfo;
          
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `
You are a helpful software services and job search assistant. 

User asked: "${query}"
Context: ${context}

Available services: Software development, mobile apps, cloud services, DevOps, data analytics, AI/ML, cybersecurity, UI/UX design
Job services: Software development, data science, DevOps, product management, design, QA, technical support

Provide a helpful, professional response that guides the user to either our services or job opportunities based on their query. Be conversational and offer to help with specific details.
`;

          const aiResponse = await model.generateContent(prompt);
          response = aiResponse.response.text().trim();
        }
      } catch {
        // If FAQ search fails, generate AI response
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
You are a helpful software services and job search assistant. 

User asked: "${query}"

We offer software development services and job placement assistance. Provide a helpful, professional response that guides the user to either our services or job opportunities based on their query.
`;

        const aiResponse = await model.generateContent(prompt);
        response = aiResponse.response.text().trim();
      }
    }

    // 5. Store conversation context (only if table exists)
    if (sessionId) {
      try {
        await db.query(
          `INSERT INTO conversation_contexts (session_id, user_id, context_type, current_topic, user_intent, conversation_state)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           current_topic = VALUES(current_topic),
           user_intent = VALUES(user_intent),
           conversation_state = VALUES(conversation_state),
           updated_at = CURRENT_TIMESTAMP`,
          [
            sessionId,
            userId || null,
            intent.contextType,
            query.substring(0, 200),
            intent.intent,
            JSON.stringify({ lastQuery: query, intent: intent.intent })
          ]
        );
      } catch {
        console.log("Could not store conversation context - table may not exist");
      }
    }

    return NextResponse.json({ 
      answer: response, 
      context: context,
      intent: intent.intent,
      contextType: intent.contextType
    });
    
  } catch (err) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
