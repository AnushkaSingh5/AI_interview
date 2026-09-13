import React, { useState, useEffect } from 'react';

const TypewriterQuestion = ({
  text = '',
  isSpeaking = false,
  className = '',
  style = {}
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    // If AI is not speaking (or completed speaking), immediately show 100% of text
    if (!isSpeaking) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // When AI is actively speaking, progressively type out the text in sync
    setIsTyping(true);
    setDisplayedText('');
    let charIndex = 0;
    const totalChars = text.length;

    // Adaptive typing pace based on length (targeting ~4 to 7 seconds typing duration)
    const effectiveInterval = Math.max(16, Math.min(40, Math.floor(5200 / (totalChars || 1))));

    const timer = setInterval(() => {
      charIndex += 1;
      setDisplayedText(text.slice(0, charIndex));
      if (charIndex >= totalChars) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, effectiveInterval);

    return () => {
      clearInterval(timer);
    };
  }, [text, isSpeaking]);

  return (
    <span className={className} style={{ display: 'inline', ...style }}>
      {displayedText}
      {isSpeaking && isTyping && (
        <span
          className="d-inline-block ms-1 rounded-pill"
          style={{
            width: '2.5px',
            height: '1.1em',
            backgroundColor: '#38bdf8',
            verticalAlign: 'text-bottom',
            boxShadow: '0 0 8px #38bdf8',
            display: 'inline-block'
          }}
        />
      )}
    </span>
  );
};

export default TypewriterQuestion;
