import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaPaperPlane, FaTimes, FaComments, FaCalendarTimes, FaExclamationTriangle, FaBoxes } from 'react-icons/fa';
import API from '../services/api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hi there! I am your Shelf Life Assistant. I'm here to help you track product expiries and manage reminders. Ask me anything about your stock status!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Scroll message logs to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText;
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await API.post('/chatbot', { message: userMsgText });
      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: response.data.reply,
        batches: response.data.batches || [],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botReply]);
    } catch (error) {
      console.error('Failed to query chatbot:', error);
      const errorReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format timestamps nicely
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to parse simple markdown formatting like bold text (**text**) and newlines (\n)
  const parseMessageText = (text) => {
    if (!text) return '';
    
    // Replace markdown bold
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace newlines with <br />
    return formattedText.split('\n').map((line, idx) => (
      <span key={idx}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        {idx < formattedText.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Floating Chatbot Toggle Button */}
      <button 
        className={`chatbot-float-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open Shelf Life Assistant"
      >
        {isOpen ? <FaTimes /> : <FaComments />}
      </button>

      {/* Chat Slide-in Panel */}
      <div className={`chatbot-panel ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <FaRobot />
            </div>
            <div>
              <h4 className="chatbot-title">Shelf Life Assistant</h4>
              <span className="chatbot-subtitle">AI Agent • Online</span>
            </div>
          </div>
          <button 
            className="chatbot-close-btn" 
            onClick={() => setIsOpen(false)}
            title="Close Assistant"
          >
            <FaTimes />
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-message-row ${msg.sender === 'user' ? 'user' : 'bot'}`}
            >
              {msg.sender === 'bot' && (
                <div className="chat-avatar-small">
                  <FaRobot />
                </div>
              )}
              <div className="chat-message-bubble">
                <div className="chat-message-text">
                  {parseMessageText(msg.text)}
                </div>

                {/* Display matched batches inside message bubbles */}
                {msg.batches && msg.batches.length > 0 && (
                  <div className="chat-batches-container">
                    {msg.batches.map(batch => (
                      <div 
                        key={batch.id} 
                        className="chat-batch-card"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/batches/${batch.id}`);
                        }}
                        title="Click to view full batch details"
                      >
                        <div className="chat-batch-card-header">
                          <span className="chat-batch-name">{batch.product_name}</span>
                          <span className={`badge ${
                            batch.status === 'Expired' ? 'badge-red' : 
                            batch.status === 'Near Expiry' ? 'badge-orange' : 'badge-green'
                          }`}>
                            {batch.status}
                          </span>
                        </div>
                        
                        <div className="chat-batch-card-details">
                          <div className="chat-batch-meta">
                            <span>Batch: <strong>{batch.batch_number}</strong></span>
                            <span>Qty: <strong>{batch.quantity}</strong></span>
                          </div>
                          <div className="chat-batch-expiry">
                            <span>Expires: {batch.expiry_date}</span>
                            <span className="chat-remaining-days">
                              {batch.remaining_days < 0 
                                ? `Expired ${Math.abs(batch.remaining_days)}d ago` 
                                : `Expires in ${batch.remaining_days}d`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <span className="chat-message-time">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message-row bot">
              <div className="chat-avatar-small">
                <FaRobot />
              </div>
              <div className="chat-message-bubble typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompts */}
        {messages.length === 1 && !isLoading && (
          <div className="chat-suggestion-prompts">
            <button 
              className="chat-prompt-btn"
              onClick={() => {
                setInputText("Show near expiry products");
              }}
            >
              Expiring Soon
            </button>
            <button 
              className="chat-prompt-btn"
              onClick={() => {
                setInputText("List expired items");
              }}
            >
              List Expired
            </button>
            <button 
              className="chat-prompt-btn"
              onClick={() => {
                setInputText("What should I do now?");
              }}
            >
              Action Items
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="chatbot-input-area">
          <input 
            type="text" 
            placeholder="Ask a query..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="chatbot-input-field"
          />
          <button 
            type="submit" 
            className="chatbot-send-btn" 
            disabled={isLoading || !inputText.trim()}
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </>
  );
};

export default Chatbot;
