import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@heroui/react';
import { useTooltipState } from '../../utils/useTooltipState';
import { GetFileRemark, SetFileRemark, DeleteFileRemark } from '../../../wailsjs/go/main/App';
import { useSelectionStore } from '../../store/selectionStore';

export default function RemarkPanel() {
  const deleteTp = useTooltipState(200)
  const { selectedPaths } = useSelectionStore();
  const [remark, setRemark] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const path = selectedPaths.size === 1 ? Array.from(selectedPaths)[0] : null;

  useEffect(() => {
    if (!path) {
      setRemark('');
      setIsEditing(false);
      return;
    }
    
    GetFileRemark(path)
      .then(res => setRemark(res || ''))
      .catch(() => setRemark(''));
      
    setIsEditing(false);
  }, [path]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [isEditing]);

  if (!path) return null;

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      await DeleteFileRemark(path);
      setRemark('');
    } else {
      await SetFileRemark(path, trimmed);
      setRemark(trimmed);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await DeleteFileRemark(path);
    setRemark('');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="w-full flex flex-col shrink-0 mt-4 mb-2">
      <div className="w-full relative flex items-center justify-center my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative bg-white px-3 text-xs text-gray-400 font-medium tracking-widest uppercase">
          备注
        </div>
      </div>

      <div className="px-4 mt-2 w-full flex flex-col items-start gap-2">
        {remark && !isEditing && (
          <div className="w-full group rounded-lg p-2 hover:bg-gray-50 transition-colors flex justify-between items-start">
            <div 
              className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed cursor-text flex-1"
              onClick={() => {
                setInputValue(remark);
                setIsEditing(true);
              }}
            >
              {remark}
            </div>
            <Tooltip delay={200} isOpen={deleteTp.isOpen}>
              <button
                ref={deleteTp.triggerRef as React.Ref<HTMLButtonElement>}
                onClick={handleDelete}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all text-sf-text hover:bg-gray-200 shrink-0 ml-2"
                {...deleteTp.triggerProps}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <Tooltip.Content placement="left" triggerRef={deleteTp.triggerRef}>删除</Tooltip.Content>
            </Tooltip>
          </div>
        )}

        {isEditing && (
          <div className="w-full relative bg-gray-50 rounded-lg p-2 border border-gray-200 focus-within:border-gray-400 transition-all overflow-hidden">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full min-h-[60px] bg-transparent text-sm text-gray-700 outline-none resize-none leading-relaxed"
              placeholder=""
            />
          </div>
        )}

        {(!remark && !isEditing) && (
          <button 
            onClick={() => {
              setInputValue(remark);
              setIsEditing(true);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-sf-text self-center"
          >
            <svg 
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
