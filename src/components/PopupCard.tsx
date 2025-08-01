'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useCompletion, useChat } from '@ai-sdk/react';
import renderMath from './renderMath';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface PopupCardProps {
  position: { x: number; y: number; side: 'left' | 'right'; positionFromBottom?: boolean };
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
  const [streamingText, setStreamingText] = useState('');
  const [debouncedCompletion, setDebouncedCompletion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ai-sdk hooks */
  const {
    completion,
    complete,
    isLoading,
    error: completionError,
  } = useCompletion({
    api: '/api/explain',
    streamProtocol: 'data',
    onError: err => (setLocalError('Failed to load explanation'), console.error(err)),
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
    body: { fileName, type, imageUrl, initialExplanation: completion },
    onError: err => (setLocalError('Failed to load chat response'), console.error(err)),
  });

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // First, call the original submit handler to send the message
    handleSubmit(e);
    // immediately blur the input to prevent jump back
    inputRef.current?.blur();
  };

  /* request explanation once per payload  */
  useEffect(() => {
    const serialized = String(content);
    if (!serialized || !fileName) return;
    complete('', { body: { content: serialized, fileName, type, imageUrl } }).catch(e => {
      setLocalError('Failed to start explanation');
      console.error(e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, fileName, type, imageUrl]);

  /* debounce completion updates */
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedCompletion(completion || '');
    }, 35); // debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [completion]);

  /* flatten data for Virtuoso (explanation + chat) */
  type ListItem =
    | { kind: 'exp'; content: string; id: string }
    | { kind: 'msg'; role: string; content: string; id: string };

  const listData: ListItem[] = useMemo(() => {
    const arr: ListItem[] = [];
    if (debouncedCompletion) {
      arr.push({ 
        kind: 'exp', 
        content: debouncedCompletion, 
        id: 'explanation' 
      });
    }
    messages.forEach((m, index) => {
      arr.push({ 
        kind: 'msg', 
        role: m.role, 
        content: m.content, 
        id: `msg-${index}` 
      });
    });
    return arr;
  }, [debouncedCompletion, messages]);

  /* render text with math and markdown */
  const renderText = (text: string) => {
    // First render math, then process markdown
    const mathRendered = renderMath(text);
    let html = mathRendered.__html;
    
    // Process markdown bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    return { __html: html };
  };

  /* item renderer with memoization for append-only rendering */
  const renderItem = React.useCallback((_: number, item: ListItem) => {
    if (item.kind === 'exp') {
      return (
        <div
          key={item.id}
          className="text-sm text-gray-700 leading-relaxed virtuoso-content"
          dangerouslySetInnerHTML={renderText(item.content)}
        />
      );
    }
    return (
      <div 
        key={item.id}
        className="w-full flex"
        style={{ 
          justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start'
        }}
      >
        <div className={`text-sm max-w-[100%] ${
          item.role === 'user' ? 'text-blue-600 font-medium' : 'text-gray-700'
        }`}>
          <div 
            className="text-xs text-gray-500 font-medium mb-1"
            style={{ 
              textAlign: item.role === 'user' ? 'right' : 'left'
            }}
          >
            {item.role === 'user' ? 'You' : 'AI'}
          </div>
          <div
            className={item.role === 'user' ? 'virtuoso-content' : ''}
            style={{ 
              textAlign: item.role === 'user' ? 'right' : 'left'
            }}
            dangerouslySetInnerHTML={renderText(item.content)}
          />
        </div>
      </div>
    );
  }, []);

  console.log('PopupCard render - position:', position, 'completion length:', completion?.length);

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl flex flex-col max-w-none sm:max-w-none"
      style={{
        left: position.x,
        [position.positionFromBottom ? 'bottom' : 'top']: position.y,
        width: '450px',
        height: '450px',
        minWidth: '450px',
        maxWidth: '450px',
        minHeight: '450px',
        maxHeight: '450px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Card className="h-full flex flex-col shadow-xl">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between h-6">
            <CardTitle className="text-base leading-none">Explanation</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4 pb-0">
          {isLoading && (
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Getting explanation…
            </div>
          )}

          {(localError || completionError) && (
            <div className="text-sm text-destructive mb-4">
              {localError || completionError?.message}
            </div>
          )}

          {/* content area */}
          <div className="flex-1" style={{ minHeight: 0, height: '100%' }}>
            <Virtuoso
              ref={virtuosoRef}
              data={listData}
              followOutput="smooth"
              style={{ height: '100%' }}
              itemContent={renderItem}
              components={{
                Item: ({ children, ...props }) => (
                  <div {...props} className="pb-5 last:pb-0">{children}</div>
                ),
              }}
            />
          </div>

          {(localError || chatError) && (
            <div className="text-sm text-destructive mt-4">
              {localError || chatError?.message}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3">
          {completion && !isLoading && !localError && !completionError && (
            <>
              <form onSubmit={handleFormSubmit} className="flex w-full gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a follow‑up question…"
                  className="text-sm"
                  disabled={isChatLoading}
                />
                <Button
                  type="submit"
                  disabled={isChatLoading || !input.trim()}
                  size="sm"
                  className="h-10"
                >
                  {isChatLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </form>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PopupCard;