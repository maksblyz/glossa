'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCompletion, useChat } from '@ai-sdk/react';
import renderMath from './renderMath';

interface PopupCardProps {
  position: { x: number; y: number; side: 'left' | 'right' };
  content: React.ReactNode;
  onClose: () => void;
  type?: string;
  fileName: string;
  imageUrl?: string;
}

const PopupCard: React.FC<PopupCardProps> = ({
  position,
  content,
  onClose,
  type,
  fileName,
  imageUrl,
}) => {
  const [localError, setLocalError] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);

  const {
    completion,
    complete,
    isLoading,
    error: completionError,
  } = useCompletion({
    api: '/api/explain',
    streamProtocol: 'data',           //  match the server
    onError: err => {
      console.error(err);
      setLocalError('Failed to load explanation');
    },
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading,
    error: chatError,
  } = useChat({
    api: '/api/explain',
    streamProtocol: 'data',
    body: {
      fileName,
      type,
      imageUrl,
      initialExplanation: completion,
    },
    onError: err => {
      console.error(err);
      setLocalError('Failed to load chat response');
    },
  });

  const serialized = React.useMemo(
    () => String(content),          // flatten ReactNode → string
    [content, fileName, type, imageUrl]       // recompute only when any of these change
  );
  
  // 2️⃣ effect that runs exactly once per unique payload
  useEffect(() => {
    if (!serialized || !fileName) return;
  
    const run = async () => {
      try {
        await complete('', {          // empty prompt
          body: { content: serialized, fileName, type, imageUrl }
        });
      } catch (e) {
        console.error(e);
        setLocalError('Failed to start explanation');
      }
    };
  
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, fileName, type, imageUrl]);   // deps are now stable primitives

  return (
    <div
      className="popup-card fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md"
      style={{
        left: position.x,
        top: position.y,
        width: 480,
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">Explanation</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-600 mb-3 flex items-center">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2" />
          Getting explanation…s
        </div>
      )}

      {(localError || completionError) && (
        <div className="text-sm text-red-600 mb-3">
          {localError || completionError?.message}
        </div>
      )}

      {completion && !isLoading && !localError && !completionError && (
        <div
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={renderMath(completion)}
        />
      )}

      {/* Chat Interface */}
      {completion && !isLoading && !localError && !completionError && (
        <div className="mt-4 pt-3 border-t">
          {/* Chat Messages */}
          {messages.length > 1 && (
            <div className="max-h-32 overflow-y-auto mb-3 space-y-2">
              {messages.slice(1).map((message, index) => (
                <div
                  key={index}
                  className={`text-sm ${
                    message.role === 'user' 
                      ? 'text-blue-600 font-medium' 
                      : 'text-gray-700'
                  }`}
                >
                  <div className="font-medium text-xs text-gray-500 mb-1">
                    {message.role === 'user' ? 'You' : 'AI'}
                  </div>
                  <div dangerouslySetInnerHTML={renderMath(message.content)} />
                </div>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={chatInputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a follow-up question..."
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={isChatLoading || !input.trim()}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChatLoading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                'Send'
              )}
            </button>
          </form>

          {(localError || chatError) && (
            <div className="text-sm text-red-600 mt-2">
              {localError || chatError?.message}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
        Click outside to close
        {type && <> • Content type: {type}</>}
      </div>
    </div>
  );
};

export default PopupCard;
