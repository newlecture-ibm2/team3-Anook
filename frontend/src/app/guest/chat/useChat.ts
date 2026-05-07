import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { ChatMessage } from './_components/ChatScreen';

interface BackendMessage {
  id: number;
  senderType: 'GUEST' | 'AI';
  content: string;
  translatedContent: string | null;
  createdAt: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [roomNo, setRoomNo] = useState<string | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  // 0. 세션 정보 가져오기
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.roomNo) {
            setRoomNo(data.roomNo);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      }
    };
    fetchSession();
  }, []);

  // 1. 대화 내역 불러오기
  useEffect(() => {
    if (!roomNo) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/chat/${roomNo}/messages`);
        if (!response.ok) throw new Error('Failed to fetch chat history');

        const data: BackendMessage[] = await response.json();

        if (data.length === 0) {
          setMessages([
            {
              id: 'welcome-1',
              variant: 'received',
              type: 'WELCOME',
              content: '안녕하세요! 그랜드 호텔 AI 컨시어지입니다 🏨\n무엇이든 편하게 말씀해주세요.\n\n💡 예시:\n• "수건 2개 가져다주세요"\n• "조식 몇 시에 열어요?"',
            },
            {
              id: 'idle-1',
              variant: 'received',
              type: 'QUICK_REPLY',
              content: '추가로 필요한 서비스가 있으신가요?',
              meta: { options: ['🛏️ 수건 요청', '🧴 어메니티 추가', '🧹 룸 클리닝', '🔑 체크아웃 문의'] }
            }
          ]);
        } else {
          const historyMessages: ChatMessage[] = data.map(msg => ({
            id: msg.id.toString(),
            variant: msg.senderType === 'GUEST' ? 'sent' : 'received',
            content: msg.content,
            type: 'TEXT'
          }));
          setMessages(historyMessages);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchHistory();
  }, [roomNo]);

  // 2. WebSocket 연결
  useEffect(() => {
    if (!roomNo) return;

    const client = new Client({
      brokerURL: process.env.NODE_ENV === 'production'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
        : 'ws://localhost:8080/ws',
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('STOMP Connected');
        client.subscribe(`/topic/room/${roomNo}`, (message) => {
          if (message.body) {
            const payload = JSON.parse(message.body);

            if (payload.type === 'AI_RESPONSE' || payload.type === 'AI_ERROR') {
              setIsTyping(false);

              const newAiMsg: ChatMessage = {
                id: payload.messageId ? payload.messageId.toString() : Date.now().toString(),
                variant: 'received',
                content: payload.content,
                type: payload.uiType || 'TEXT',
                meta: payload.meta || {},
              };

              setMessages(prev => [...prev, newAiMsg]);
            } else if (['NEW_REQUEST', 'STATUS_CHANGED', 'CANCEL_REQUEST_RECEIVED', 'CANCEL_APPROVED', 'CANCEL_REJECTED'].includes(payload.type)) {
              const progressMap: Record<string, number> = {
                'PENDING': 33, 'ASSIGNED': 50, 'IN_PROGRESS': 66, 'COMPLETED': 100, 'CANCELLED': 0
              };
              const isCancelled = payload.status === 'CANCELLED';
              const isCancelPending = payload.type === 'CANCEL_REQUEST_RECEIVED';

              let contentText = payload.summary;
              if (isCancelled) contentText = '요청이 취소되었습니다';
              if (isCancelPending) contentText = `${payload.summary} (취소 승인 대기 중)`;

              const statusMsg: ChatMessage = {
                id: `request-${payload.requestId}`,
                variant: 'received',
                type: 'STATUS_CARD',
                content: contentText,
                meta: {
                  progress: progressMap[payload.status] || 0,
                  cancelled: isCancelled,
                  cancelPending: isCancelPending,
                }
              };

              setMessages(prev => {
                const existingIdx = prev.findIndex(m => m.id === `request-${payload.requestId}`);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = statusMsg;
                  return updated;
                }
                return [...prev, statusMsg];
              });

              if (payload.status === 'COMPLETED') {
                setTimeout(() => {
                  setMessages(prev => [...prev, {
                    id: `feedback-${Date.now()}`,
                    variant: 'received',
                    type: 'FEEDBACK',
                  }]);
                }, 1000);
              }
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [roomNo]);

  // 3. 메시지 전송
  const sendMessage = async (text: string) => {
    if (!roomNo) return;

    const tempId = `temp-${Date.now()}`;
    const newUserMsg: ChatMessage = { id: tempId, variant: 'sent', content: text };
    setMessages(prev => [...prev, newUserMsg]);

    setIsTyping(true);

    try {
      const response = await fetch(`/api/chat/${roomNo}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok) {
        setIsTyping(false);
        const errorData = await response.json().catch(() => ({}));
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          variant: 'received',
          content: errorData.error || '메시지 전송에 실패했습니다. 다시 시도해 주세요.',
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      const data = await response.json();
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? { ...msg, id: data.guestMessageId.toString() } : msg
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  return {
    messages,
    isTyping,
    sendMessage
  };
}
