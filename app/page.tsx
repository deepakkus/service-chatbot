"use client";
import { useState } from "react";
import { FaLaptopCode, FaGlobe, FaMobile, FaCloud, FaShieldAlt, FaPalette, FaChartLine, FaBrain, FaCogs } from "react-icons/fa";
import { FiMinimize2, FiMaximize2, FiSend, FiDollarSign, FiClock, FiMapPin } from "react-icons/fi";

interface Message {
  role: string;
  text: string;
  timestamp: Date;
  intent?: string;
  contextType?: string;
}

interface ServiceCategory {
  name: string;
  description: string;
  icon: string;
}

interface JobPosting {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'services' | 'jobs'>('chat');
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const serviceCategories: ServiceCategory[] = [
    { name: 'Web Development', description: 'Custom websites and web applications', icon: 'globe' },
    { name: 'Mobile Development', description: 'iOS and Android applications', icon: 'mobile' },
    { name: 'Cloud Services', description: 'AWS, Azure, and Google Cloud solutions', icon: 'cloud' },
    { name: 'DevOps & CI/CD', description: 'Automation and deployment pipelines', icon: 'cogs' },
    { name: 'Data Analytics', description: 'Business intelligence and data processing', icon: 'chart' },
    { name: 'AI & Machine Learning', description: 'Intelligent automation and predictions', icon: 'brain' },
    { name: 'Cybersecurity', description: 'Security audits and protection services', icon: 'shield' },
    { name: 'UI/UX Design', description: 'User interface and experience design', icon: 'palette' }
  ];

  const sampleJobs: JobPosting[] = [
    {
      title: 'Senior Full-Stack Developer',
      company: 'TechCorp Inc.',
      location: 'Remote',
      type: 'Full-time',
      salary: '$80,000 - $120,000',
      description: 'We are looking for an experienced full-stack developer to join our team.'
    },
    {
      title: 'Frontend Developer',
      company: 'StartupXYZ',
      location: 'New York, NY',
      type: 'Full-time',
      salary: '$60,000 - $90,000',
      description: 'Join our fast-growing startup as a frontend developer.'
    },
    {
      title: 'Data Scientist',
      company: 'DataTech Solutions',
      location: 'San Francisco, CA',
      type: 'Full-time',
      salary: '$100,000 - $150,000',
      description: 'Lead our data science initiatives and machine learning projects.'
    }
  ];

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactElement> = {
      globe: <FaGlobe className="text-lg" />,
      mobile: <FaMobile className="text-lg" />,
      cloud: <FaCloud className="text-lg" />,
      cogs: <FaCogs className="text-lg" />,
      chart: <FaChartLine className="text-lg" />,
      brain: <FaBrain className="text-lg" />,
      shield: <FaShieldAlt className="text-lg" />,
      palette: <FaPalette className="text-lg" />
    };
    return iconMap[iconName] || <FaLaptopCode className="text-lg" />;
  };

  async function sendMessage() {
    if (!input.trim()) return;

    const newMsg: Message = { 
      role: "user", 
      text: input, 
      timestamp: new Date() 
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: input, 
          userId: 1, 
          sessionId: sessionId 
        }),
      });

      const data = await res.json();
      const botMsg: Message = { 
        role: "bot", 
        text: data.answer, 
        timestamp: new Date(),
        intent: data.intent,
        contextType: data.contextType
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg: Message = { 
        role: "bot", 
        text: "Sorry, I encountered an error. Please try again.", 
        timestamp: new Date() 
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    
    setInput("");
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getQuickActions = () => {
    return [
      { text: "Get a quote", action: () => setInput("I need a quote for a website") },
      { text: "Find jobs", action: () => setInput("I'm looking for software development jobs") },
      { text: "Our services", action: () => setInput("What services do you offer?") },
      { text: "Pricing", action: () => setInput("How much do your services cost?") }
    ];
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 text-sm shadow-lg border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2">
        <div className="flex items-center space-x-2">
          <FaLaptopCode className="text-lg" />
          <span className="font-bold">Service & Job Assistant</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:opacity-80"
          >
            {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      {!isMinimized && (
        <div className="flex bg-gray-100">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 px-3 text-center text-sm font-medium ${
              activeTab === 'chat' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-2 px-3 text-center text-sm font-medium ${
              activeTab === 'services' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-2 px-3 text-center text-sm font-medium ${
              activeTab === 'jobs' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Jobs
          </button>
        </div>
      )}

      {/* Content Area */}
      {!isMinimized && (
        <div className="h-96 overflow-y-auto">
          {activeTab === 'chat' && (
            <div className="p-3">
              {/* Quick Actions */}
              {messages.length === 0 && (
                <div className="mb-4">
                  <p className="text-gray-600 text-sm mb-3">How can I help you today?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getQuickActions().map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-2 px-3 rounded-lg border border-blue-200 transition-colors"
                      >
                        {action.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-3 ${
                    m.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="text-sm">{m.text}</p>
                    <p className={`text-xs mt-1 ${
                      m.role === "user" ? "text-blue-100" : "text-gray-500"
                    }`}>
                      {formatTime(m.timestamp)}
                    </p>
                  </div>
                  {m.intent && m.role === "bot" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Intent: {m.intent} • Type: {m.contextType}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'services' && (
            <div className="p-3">
              <h3 className="font-semibold text-gray-800 mb-3">Our Services</h3>
              <div className="space-y-3">
                {serviceCategories.map((category, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600">
                        {getIconComponent(category.icon)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setInput(`Tell me more about ${category.name.toLowerCase()} services`)}
                      className="mt-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1 px-2 rounded transition-colors"
                    >
                      Learn More
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="p-3">
              <h3 className="font-semibold text-gray-800 mb-3">Recent Job Openings</h3>
              <div className="space-y-3">
                {sampleJobs.map((job, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-800">{job.title}</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                      <span className="flex items-center">
                        <FiMapPin className="mr-1" />
                        {job.company}
                      </span>
                      <span className="flex items-center">
                        <FiClock className="mr-1" />
                        {job.type}
                      </span>
                      <span className="flex items-center">
                        <FiDollarSign className="mr-1" />
                        {job.salary}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{job.description}</p>
                    <button
                      onClick={() => setInput(`I'm interested in the ${job.title} position at ${job.company}`)}
                      className="mt-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 py-1 px-2 rounded transition-colors"
                    >
                      Apply Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      {!isMinimized && activeTab === 'chat' && (
        <div className="flex items-center border-t bg-white p-2">
          <input
            className="flex-1 border rounded-full px-3 py-2 outline-none text-sm"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            className="ml-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
          >
            <FiSend />
          </button>
        </div>
      )}
    </div>
  );
}
