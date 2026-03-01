import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
    role: "user" | "model";
    text: string;
}

export default function Chatbot({ user }: { user: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", text: "Xin chào! Mình là trợ lý của Hệ thống Đặt phòng. Mình có thể giúp bạn tìm phòng trống, giải đáp quy định, hoặc tư vấn sức chứa nhé!" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: userMessage }]);
        setLoading(true);

        try {
            const token = localStorage.getItem("token") || "";
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ message: userMessage })
            });
            const data = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { role: "model", text: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: "model", text: data.message || "Xin lỗi, đã có lỗi kết nối tới AI." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "model", text: "Không thể kết nối tới server." }]);
        }
        setLoading(false);
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
                        width: 56, height: 56, borderRadius: "50%",
                        background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                        color: "white", border: "none", boxShadow: "0 8px 24px rgba(79, 70, 229, 0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        transition: "transform 0.2s"
                    }}
                    className="hover:scale-110"
                >
                    <Sparkles size={24} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: "fixed", bottom: 24, right: 24, zIndex: 9999,
                    width: 360, height: 500, background: "white", borderRadius: 20,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid var(--border)",
                    display: "flex", flexDirection: "column", overflow: "hidden"
                }}>
                    {/* Header */}
                    <div style={{
                        background: "linear-gradient(135deg, #1E1B4B, #4F46E5)", padding: "16px 20px",
                        display: "flex", alignItems: "center", justifyContent: "space-between", color: "white"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Bot size={16} color="#fff" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Trợ lý Ảo</h3>
                                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Hỗ trợ Đặt phòng</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#F8FAFC" }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                                {m.role === "model" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bot size={14} color="#4F46E5" /></div>}
                                <div style={{
                                    background: m.role === "user" ? "#4F46E5" : "white",
                                    color: m.role === "user" ? "white" : "#0F172A",
                                    padding: "10px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                                    border: m.role === "model" ? "1px solid var(--border)" : "none",
                                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                                }}>
                                    {/* format line breaks and extremely basic markdown */}
                                    {m.text.split('\n').map((line, idx) => {
                                        // Simple bold parser: **text** -> <strong>text</strong>
                                        const lineWithBold = line.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return <strong key={i}>{part.slice(2, -2)}</strong>;
                                            }
                                            return part;
                                        });

                                        return (
                                            <React.Fragment key={idx}>
                                                {lineWithBold}
                                                <br />
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={14} color="#4F46E5" /></div>
                                <div style={{ background: "white", padding: "10px 14px", borderRadius: 16, fontSize: 13, border: "1px solid var(--border)", fontStyle: "italic", color: "#64748B" }}>
                                    Đang suy nghĩ...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} style={{ borderTop: "1px solid var(--border)", padding: 12, background: "white", display: "flex", gap: 8 }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Hỏi AI tư vấn..."
                            style={{ flex: 1, border: "1px solid var(--border)", background: "#F1F5F9", borderRadius: 20, padding: "10px 16px", fontSize: 13, outline: "none" }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            style={{ width: 40, height: 40, borderRadius: "50%", background: input.trim() ? "#4F46E5" : "#E2E8F0", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", transition: "0.2s" }}
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
