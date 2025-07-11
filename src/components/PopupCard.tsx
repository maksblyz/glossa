import React, { useState, useEffect } from 'react';
import renderMath from './renderMath'; // We'll create this as a shared utility

interface PopupCardProps {
  position: { x: number; y: number; side: 'left' | 'right' };
  content: React.ReactNode;
  onClose: () => void;
  type?: string;
  fileName: string;
}

const PopupCard: React.FC<PopupCardProps> = ({ position, content, onClose, type, fileName }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  console.log('PopupCard rendering with:', { position, content, type });
  console.log('PopupCard position details:', { x: position.x, y: position.y, side: position.side });

  useEffect(() => {
    const fetchExplanation = async () => {
      if (!content || !fileName) {
        console.log('Skipping fetch - missing content or fileName');
        console.log('Content:', content);
        console.log('FileName:', fileName);
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      const requestBody = { 
        content: String(content),
        fileName: fileName,
        type: type,
      };
      
      console.log('Sending request with body:', requestBody);
      
      try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response not ok:', response.status, errorText);
          throw new Error('Failed to get explanation');
        }

        const data = await response.json();
        setExplanation(data.explanation);
      } catch (err) {
        console.error('Error fetching explanation:', err);
        setError('Failed to load explanation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [content, fileName, type]);
  
  return (
    <div
      className="popup-card fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md"
      style={{
        left: position.x,
        top: position.y,
        width: '480px',
        transform: position.side === 'left' ? 'translateX(-100%)' : 'none',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">Explanation</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>
      
      {isLoading && (
        <div className="text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            Getting explanation...
          </div>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 mb-3">
          <div className="font-semibold">Error:</div>
          {error}
        </div>
      )}
      
      {explanation && !isLoading && !error && (
        <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={renderMath(explanation)} />
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click outside to close
          {type && (
            <>
              {' '}• Content type: {type}
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default PopupCard; 