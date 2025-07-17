'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useCompletion, useChat } from '@ai-sdk/react';
import renderMath from './renderMath';

/* ――― shadcn / radix UI parts ――― */
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

/* ─────────────────────────────────────────────────────────────── */

const PopupCard: React.FC<PopupCardProps> = ({
  position,
  content,
  onClose,
  type,
  fileName,
  imageUrl,
}) => {
  const [localError, setLocalError] = useState('');
  const [debouncedCompletion, setDebouncedCompletion] = useState('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  /* ――― ai-sdk hooks ――― */
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
    // Then, immediately blur the input to prevent the "jump back"
    inputRef.current?.blur();
  };

  /* ――― request explanation exactly once per payload ――― */
  useEffect(() => {
    const serialized = String(content);
    if (!serialized || !fileName) return;
    complete('', { body: { content: serialized, fileName, type, imageUrl } }).catch(e => {
      setLocalError('Failed to start explanation');
      console.error(e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, fileName, type, imageUrl]);

  /* ――― debounce completion updates ――― */
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

  /* ――― flatten data for Virtuoso (explanation + chat) ――― */
  type ListItem =
    | { kind: 'exp'; content: string }
    | { kind: 'msg'; role: string; content: string };

  const listData: ListItem[] = useMemo(() => {
    const arr: ListItem[] = [];
    if (debouncedCompletion) arr.push({ kind: 'exp', content: debouncedCompletion });
    messages.forEach(m => arr.push({ kind: 'msg', role: m.role, content: m.content }));
    return arr;
  }, [debouncedCompletion, messages]);

  /* ――― render text with math and markdown ――― */
  const renderText = (text: string) => {
    // First render math, then process markdown
    const mathRendered = renderMath(text);
    let html = mathRendered.__html;
    
    // Process markdown bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    return { __html: html };
  };

  /* ――― item renderer ――― */
  const renderItem = (_: number, item: ListItem) => {
    if (item.kind === 'exp') {
      return (
        <div
          className="text-sm text-gray-700 leading-relaxed virtuoso-content"
          dangerouslySetInnerHTML={renderText(item.content)}
        />
      );
    }
    return (
      <div
        className={`text-sm ${
          item.role === 'user' ? 'text-blue-600 font-medium' : 'text-gray-700'
        }`}
      >
        <div className="text-xs text-gray-500 font-medium mb-1">
          {item.role === 'user' ? 'You' : 'AI'}
        </div>
        <div
          className="virtuoso-content"
          dangerouslySetInnerHTML={renderText(item.content)}
        />
      </div>
    );
  };

  /* ──────────────────────────────────────────────────────────── */

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
        {/* header */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
          <h3 className="text-lg font-semibold">Explanation</h3>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        {/* body */}
        <div className="flex-1 p-4" style={{ flex: '1 1 auto', minHeight: '0' }}>
          {isLoading && (
            <div className="flex items-center text-sm text-gray-600 mb-4">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2" />
              Getting explanation…
            </div>
          )}

          {(localError || completionError) && (
            <div className="text-sm text-red-600 mb-4">
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
                  <div {...props} className="pb-3 last:pb-0">{children}</div>
                ),
              }}
            />
          </div>


          {(localError || chatError) && (
            <div className="text-sm text-red-600 mt-4">
              {localError || chatError?.message}
            </div>
          )}
        </div>

        {/* footer */}
        {/* footer */}
        <div className="p-4 border-t">
          {completion && !isLoading && !localError && !completionError && (
            <form onSubmit={handleFormSubmit} className="flex w-full gap-2"> {/* 👈 Use new handler */}
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
                className="bg-black hover:bg-gray-800 text-white"
              >
                {isChatLoading ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  'Send'
                )}
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Click outside to close{type && <> • {type}</>}
          </p>
        </div>
      </div>
    );
};

export default PopupCard;