import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { ChatMessage } from './_components/ChatScreen';
import { useTranslation } from '@/app/useTranslation';
import { useUiStore } from '@/stores/useUiStore';

interface BackendMessage {
  id: number;
  senderType: 'GUEST' | 'AI' | 'STAFF';
  content: string;
  translatedContent: string | null;
  createdAt: string;
}

export interface ActiveRequest {
  requestId: number;
  domainCode: string;
  summary: string;
  status: string;
  entities?: Record<string, unknown>;
  progress: number;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [roomNo, setRoomNo] = useState<string | null>(null);
  const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);
  const stompClientRef = useRef<Client | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { t } = useTranslation();
  const setLanguage = useUiStore((state) => state.setLanguage);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const browserLang = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
      setLanguage(browserLang);
    }
  }, [setLanguage]);

  // 연속된 시스템 메시지 방지용 Ref
  const lastCancelSuccessTime = useRef<number>(0);
  const lastCancelPendingTime = useRef<number>(0);

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
              content: t.guestChat.welcomeMessage,
              meta: { options: t.guestChat.quickReplyOptions }
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

            if (payload.type === 'AI_PROGRESS') {
              setMessages(prev => {
                const filtered = prev.filter(m => m.type !== 'AI_PROGRESS');
                return [...filtered, {
                  id: `progress-${Date.now()}`,
                  variant: 'received',
                  type: 'AI_PROGRESS',
                  content: '',
                  meta: { domains: payload.domains }
                }];
              });
              return;
            }

            if (payload.type === 'AI_RESPONSE' || payload.type === 'AI_ERROR') {
              setIsTyping(false);

              // 진행 상태 메시지 제거
              setMessages(prev => {
                const filtered = prev.filter(m => m.type !== 'AI_PROGRESS');
                const newAiMsg: ChatMessage = {
                  id: payload.messageId ? payload.messageId.toString() : Date.now().toString(),
                  variant: 'received',
                  content: payload.content,
                  type: payload.options && payload.options.length > 0 ? 'QUICK_REPLY' : (payload.uiType || 'TEXT'),
                  meta: { ...(payload.meta || {}), options: payload.options },
                };
                return [...filtered, newAiMsg];
              });
            } else if (payload.type === 'STAFF_MESSAGE') {
              // 프론트데스크 직원이 보낸 메시지 → 고객 화면에 실시간 표시
              const staffMsgId = payload.messageId ? payload.messageId.toString() : Date.now().toString();
              setMessages(prev => {
                // 중복 방지
                if (prev.some(m => m.id === staffMsgId)) return prev;

                // 직원이 채팅으로 응대하기 시작하면 기존 'AI 미학습 정보(직원 연결)' 카드는 삭제
                const filtered = prev.filter(m => !(m.type === 'REQUEST_CARD' && m.meta?.domainCode === 'FRONT'));

                return [...filtered, {
                  id: staffMsgId,
                  variant: 'received',
                  content: payload.content,
                  type: 'TEXT',
                }];
              });
            } else if (payload.type === 'NEW_REQUEST' || payload.type === 'STATUS_CHANGED') {
              const progressMap: Record<string, number> = {
                'PENDING': 10, 'ESCALATED': 10, 'ASSIGNED': 50, 'IN_PROGRESS': 50, 'COMPLETED': 100, 'CANCELLED': 0
              };
              const isCancelled = payload.status === 'CANCELLED';
              const isCancelPending = payload.type === 'CANCEL_REQUEST_RECEIVED';

              // Set Active Requests for Status Bar (remove if completed or cancelled)
              setActiveRequests(prev => {
                const isFinished = payload.status === 'COMPLETED' || payload.status === 'CANCELLED';
                const filtered = prev.filter(r => r.requestId !== payload.requestId);
                if (isFinished) return filtered;

                return [...filtered, {
                  requestId: payload.requestId,
                  domainCode: payload.domainCode || 'UNKNOWN',
                  summary: payload.summary,
                  status: isCancelPending ? 'CANCEL_PENDING' : payload.status,
                  entities: payload.entities,
                  progress: progressMap[payload.status] || 0
                }];
              });

              // Add/Update Request Card in Chat Stream
              const requestMsg: ChatMessage = {
                id: `request-${payload.requestId}`,
                variant: 'received',
                type: 'REQUEST_CARD',
                content: '', // No text content needed, UI is rendered via RequestCard
                meta: {
                  requestId: payload.requestId,
                  domainCode: payload.domainCode || 'UNKNOWN',
                  summary: payload.summary,
                  status: payload.status,
                  entities: payload.entities,
                  progress: progressMap[payload.status] || 0,
                  graceRemaining: payload.graceRemaining || 0,
                  priority: payload.priority || 'NORMAL',
                  cancelPending: isCancelPending
                }
              };

              setMessages(prev => {
                const existingIdx = prev.findIndex(m => m.id === `request-${payload.requestId}` || m.meta?.requestId === payload.requestId);
                const existingMeta = existingIdx >= 0 ? (prev[existingIdx].meta || {}) : {};
                const existingGrace = existingMeta.graceRemaining || 0;

                // Remove the existing card from the list
                const filtered = prev.filter(m => m.meta?.requestId !== payload.requestId && m.id !== `request-${payload.requestId}`);

                // Append the updated card at the bottom
                return [...filtered, {
                  ...requestMsg,
                  id: `request-${payload.requestId}-${Date.now()}`, // Force re-render at the bottom
                  meta: {
                    ...requestMsg.meta,
                    entities: payload.entities || existingMeta.entities,
                    priority: payload.priority || existingMeta.priority,
                    graceRemaining: payload.type === 'NEW_REQUEST' ? payload.graceRemaining : (payload.status === 'CANCELLED' ? 0 : existingGrace)
                  }
                }];
              });

              // --- System messages for cancel flow ---
              if (payload.type === 'STATUS_CHANGED' && payload.status === 'CANCELLED') {
                const now = Date.now();
                if (now - lastCancelSuccessTime.current > 500) {
                  lastCancelSuccessTime.current = now;
                  setTimeout(() => {
                    setMessages(prev => {
                      const msgId = `system-cancel-success-${payload.requestId}`;
                      if (prev.some(m => m.id === msgId)) return prev;
                      return [...prev, {
                        id: msgId,
                        variant: 'received',
                        type: 'TEXT',
                        content: '안내: 요청이 정상적으로 취소되었습니다.',
                      }];
                    });
                  }, 600); // 디바운스(500ms)보다 길게 설정하여 모든 카드가 도착한 후 렌더링되게 보장
                }
              }

              if (payload.type === 'CANCEL_REQUEST_RECEIVED') {
                const now = Date.now();
                if (now - lastCancelPendingTime.current > 500) {
                  lastCancelPendingTime.current = now;
                  setTimeout(() => {
                    setMessages(prev => {
                      const msgId = `system-cancel-pending-${payload.requestId}`;
                      if (prev.some(m => m.id === msgId)) return prev;
                      return [...prev, {
                        id: msgId,
                        variant: 'received',
                        type: 'TEXT',
                        content: '안내: 업무가 이미 처리 중이라 담당자에게 취소를 요청했습니다.',
                      }];
                    });
                  }, 600); // 디바운스(500ms)보다 길게 설정하여 모든 카드가 도착한 후 렌더링되게 보장
                }
              }

              if (payload.status === 'COMPLETED') {
                setTimeout(() => {
                  setMessages(prev => {
                    const msgId = `system-feedback-${payload.requestId}`;
                    if (prev.some(m => m.id === msgId)) return prev;
                    return [...prev, {
                      id: msgId,
                      variant: 'received',
                      type: 'FEEDBACK',
                      content: '',
                      meta: { requestId: payload.requestId }
                    }];
                  });
                }, 1000);
              }

              if (payload.type === 'CANCEL_REJECTED') {
                setMessages(prev => {
                  const msgId = `system-cancel-reject-${payload.requestId}`;
                  if (prev.some(m => m.id === msgId)) return prev;
                  const content = '안내: 이미 업무가 진행 중이라 취소/변경이 어렵습니다. 기존 요청대로 진행됩니다. 추가로 필요하신 부분이 있다면 언제든 말씀해 주세요!';

                  return [...prev, {
                    id: msgId,
                    variant: 'received',
                    type: 'TEXT',
                    content,
                  }];
                });
              }
            } else if (payload.type === 'GRACE_EXPIRED') {
              // Hide the buttons on the specific card by forcing graceRemaining to 0
              setMessages(prev => {
                const existingIdx = prev.findIndex(m => m.id === `request-${payload.requestId}` || m.meta?.requestId === payload.requestId);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = {
                    ...updated[existingIdx],
                    meta: {
                      ...updated[existingIdx].meta,
                      graceRemaining: 0
                    }
                  };
                  return updated;
                }
                return prev;
              });
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
  const sendMessage = async (text: string, imageFile?: File) => {
    if (!roomNo) return;
    if (isTyping) return; // 이미 AI가 응답 중이면 새로운 요청 원천 차단

    // 오프라인 상태일 경우 전송 시도 자체를 차단 (버퍼링 금지)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        variant: 'received',
        content: '현재 오프라인 상태입니다. 네트워크 연결을 확인한 후 다시 전송해 주세요.',
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    let base64Image: string | undefined;
    if (imageFile) {
      base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }

    const tempId = `temp-${Date.now()}`;
    const newUserMsg: ChatMessage = { 
      id: tempId, 
      variant: 'sent', 
      content: text,
      imageUrl: base64Image 
    };
    setMessages(prev => {
      const filtered = prev.filter(m => m.type !== 'WELCOME');
      return [...filtered, newUserMsg];
    });

    setIsTyping(true);
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('content', text);
      if (base64Image) {
        formData.append('images', base64Image);
      }

      const response = await fetch(`/api/chat/${roomNo}/messages`, {
        method: 'POST',
        // FormData를 보낼 때는 Content-Type을 수동으로 지정하지 않습니다.
        // (브라우저가 자동으로 multipart/form-data와 boundary를 설정함)
        body: formData,
        signal: abortControllerRef.current.signal,
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

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Message generation stopped by user');
      } else {
        console.error('Error sending message:', error);
      }
      setIsTyping(false);
    }
  };

  const stopMessage = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  };

  // 4. Cancel Request Action
  const cancelRequest = async (requestId: number) => {
    if (!roomNo) return;
    try {
      const response = await fetch(`/api/chat/${roomNo}/requests/${requestId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) {
        console.error('Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  // 5. Confirm Request Action
  const confirmRequest = async (requestId: number) => {
    if (!roomNo) return;
    try {
      const response = await fetch(`/api/chat/${roomNo}/requests/${requestId}/confirm`, {
        method: 'POST'
      });
      if (!response.ok) {
        console.error('Failed to confirm request');
      }
    } catch (error) {
      console.error('Error confirming request:', error);
    }
  };

  return {
    messages,
    isTyping,
    sendMessage,
    activeRequests,
    cancelRequest,
    confirmRequest,
    stopMessage
  };
}
