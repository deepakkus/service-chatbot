"use client";
import { useState } from "react";
import { FaLaptopCode, FaCogs, FaTools, FaHeadset } from "react-icons/fa";
import { FiMinimize2, FiMaximize2, FiSend } from "react-icons/fi";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [icon, setIcon] = useState("laptop"); // default icon

  // Map icon names to components
  const icons: Record<string, JSX.Element> = {
    laptop: <FaLaptopCode className="text-lg" />,
    cogs: <FaCogs className="text-lg" />,
    tools: <FaTools className="text-lg" />,
    headset: <FaHeadset className="text-lg" />,
  };

  async function sendMessage() {
    if (!input.trim()) return;

    const newMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, newMsg]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input, userId: 1 }),
    });

    const data = await res.json();
    setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
    setInput("");
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 text-sm shadow-lg border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-600 text-white px-3 py-2">
        <div className="flex items-center space-x-2">
          {icons[icon]}
          <span className="font-bold">Service Assistant</span>
        </div>

        {/* Dropdown for icon selection */}
        <select
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="text-black rounded px-1 py-0.5 text-xs"
        >
          <option value="laptop">Laptop</option>
          <option value="cogs">Cogs</option>
          <option value="tools">Tools</option>
          <option value="headset">Headset</option>
        </select>

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="ml-2 hover:opacity-80"
        >
          {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
        </button>
      </div>

      {/* Chat window */}
      {!isMinimized && (
        <>
          <div className="bg-white h-96 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-2 ${
                  m.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <p
                  className={`inline-block px-3 py-2 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-100 text-blue-900"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center border-t bg-white p-2">
            <input
              className="flex-1 border rounded-full px-3 py-2 outline-none"
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
              className="ml-2 p-2 bg-blue-500 text-white rounded-full"
            >
              <FiSend />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
