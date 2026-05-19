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
  const { t } = useTranslation();
  const setLanguage = useUiStore((state) => state.setLanguage);

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome-1',
    variant: 'received',
    type: 'WELCOME',
    content: t.guestChat.welcomeMessage,
    meta: { options: t.guestChat.quickReplyOptions }
  }]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStaffTyping, setIsStaffTyping] = useState(false);
  const [roomNo, setRoomNo] = useState<string | null>(null);
  const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);
  const stompClientRef = useRef<Client | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update welcome message if language changes and it is the only message
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome-1') {
        return [{
          id: 'welcome-1',
          variant: 'received',
          type: 'WELCOME',
          content: t.guestChat.welcomeMessage,
          meta: { options: t.guestChat.quickReplyOptions }
        }];
      }
      return prev;
    });
  }, [t.guestChat.welcomeMessage, t.guestChat.quickReplyOptions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const browserLang = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
      setLanguage(browserLang);
    }
  }, [setLanguage]);

  // 연속된 시스템 메시지 방지 및 통합용 Ref
  const cancelEventsBatch = useRef<Set<'SUCCESS' | 'PENDING' | 'STAFF_SUCCESS' | 'GUEST_CANCEL_APPROVED'>>(new Set());
  const cancelBatchTimer = useRef<NodeJS.Timeout | null>(null);

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

  // 1. 대화 내역 + 요청 카드 복원 + 상태바 복원
  useEffect(() => {
    if (!roomNo) return;

    const loadChatAndRequests = async () => {
      try {
        const [msgResponse, reqResponse] = await Promise.all([
          fetch(`/api/chat/${roomNo}/messages`),
          fetch(`/api/chat/${roomNo}/requests`),
        ]);

        // 채팅 메시지 처리
        const msgData: BackendMessage[] = msgResponse.ok ? await msgResponse.json() : [];
        const reqData: any[] = reqResponse.ok ? await reqResponse.json() : [];

        if (msgData.length === 0 && reqData.length === 0) {
          setMessages([{
            id: 'welcome-1',
            variant: 'received',
            type: 'WELCOME',
            content: t.guestChat.welcomeMessage,
            meta: { options: t.guestChat.quickReplyOptions }
          }]);
          return;
        }

        // 텍스트 메시지 변환
        const chatMessages: (ChatMessage & { _ts: number })[] = msgData.map(msg => ({
          id: msg.id.toString(),
          variant: msg.senderType === 'GUEST' ? 'sent' as const : 'received' as const,
          content: msg.content,
          type: 'TEXT' as const,
          _ts: new Date(msg.createdAt).getTime(),
        }));

        // 요청 카드 변환 (시간순 삽입을 위해 _ts 포함)
        const progressMap: Record<string, number> = {
          'PENDING': 10, 'ESCALATED': 10, 'ASSIGNED': 50, 'IN_PROGRESS': 50, 'COMPLETED': 100, 'CANCELLED': 0
        };

        const requestCards: (ChatMessage & { _ts: number })[] = reqData.flatMap((r: any) => {
          const cards: (ChatMessage & { _ts: number })[] = [];

          if (r.status === 'COMPLETED') {
            // 완료된 요청 → FeedbackCard(일반) / ChatEndCard(FRONT 상담)로 복원
            const isFrontConsultation = r.domainCode === 'FRONT';
            cards.push({
              id: `system-feedback-${r.id}`,
              variant: 'received',
              type: isFrontConsultation ? 'CHAT_END' : 'FEEDBACK',
              content: '',
              meta: {
                requestId: r.id,
                summary: r.summary || '',
                domainCode: r.domainCode || '',
                completedAt: r.updatedAt || r.createdAt,
              },
              _ts: new Date(r.updatedAt || r.createdAt).getTime(),
            });
          } else if (r.status !== 'CANCELLED') {
            // 진행 중인 요청은 RequestCard로 표시
            cards.push({
              id: `request-${r.id}`,
              variant: 'received',
              type: 'REQUEST_CARD',
              content: '',
              meta: {
                requestId: r.id,
                domainCode: r.domainCode || 'UNKNOWN',
                summary: r.summary,
                status: r.status,
                entities: r.entities,
                progress: progressMap[r.status] || 0,
                graceRemaining: 0,
                priority: r.priority || 'NORMAL',
                createdAt: r.createdAt,
              },
              _ts: new Date(r.createdAt).getTime(),
            });
          }
          // CANCELLED → 복원하지 않음
          return cards;
        });

        // 시간순 정렬 후 _ts 제거
        const merged = [...chatMessages, ...requestCards]
          .sort((a, b) => a._ts - b._ts)
          .map(({ _ts, ...msg }) => msg as ChatMessage);

        setMessages(merged);

        // 상태바 복원 (진행 중인 요청만)
        const active: ActiveRequest[] = reqData
          .filter((r: any) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
          .map((r: any) => ({
            requestId: r.id,
            domainCode: r.domainCode || 'UNKNOWN',
            summary: r.summary,
            status: r.status,
            entities: r.entities,
            progress: progressMap[r.status] || 0,
          }));

        if (active.length > 0) {
          setActiveRequests(active);
        }
      } catch (error) {
        console.error('Error loading chat and requests:', error);
      }
    };

    loadChatAndRequests();
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
            console.log('[WS-RECEIVE]', payload);

            // 체크아웃에 의한 세션 만료 감지 → 즉시 로그아웃
            if (payload.type === 'SESSION_EXPIRED') {
              // BFF 세션 쿠키 파기
              fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
              window.location.href = '/login?error=CHECKED_OUT';
              return;
            }

            if (payload.type === 'AI_PROGRESS') {
              setMessages(prev => {
                const existing = prev.find(m => m.id === 'ai-progress');
                if (existing) {
                  // 기존 메시지의 meta만 업데이트 (컴포넌트 재마운트 방지 → 애니메이션 끊김 방지)
                  return prev.map(m => m.id === 'ai-progress'
                    ? { ...m, meta: { domains: payload.domains } }
                    : m
                  );
                }
                return [...prev, {
                  id: 'ai-progress',
                  variant: 'received',
                  type: 'AI_PROGRESS',
                  content: '',
                  meta: { domains: payload.domains }
                }];
              });
              return;
            }

            if (payload.type === 'AI_RESPONSE' || payload.type === 'AI_ERROR' || payload.type === 'AI_SKIPPED') {
              setIsTyping(false);

              if (payload.type === 'AI_SKIPPED') {
                return; // 직원이 채팅 중인 상태이므로 AI 응답 카드를 그리지 않음 (직원이 메시지를 보냄)
              }

              // 진행 상태 메시지 제거
              setMessages(prev => {
                const filtered = prev.filter(m => m.type !== 'AI_PROGRESS');

                // 취소 관련 AI 응답 → 요청 상태에 따라 메시지 분기
                let content = payload.content;
                const action = payload.meta?.action || payload.action;
                const isCancelResponse = action === 'CANCEL_REQUEST' || action === 'CANCEL_ALL_REQUESTS'
                  || (content && (content.includes('취소를 진행합니다') || content.includes('즉시 취소') || content.includes('취소 처리됩니다')));

                if (isCancelResponse) {
                  const hasInProgress = activeRequests.some(r => 
                    r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS' || r.status === 'CANCEL_PENDING'
                  );

                  if (hasInProgress) {
                    content = '이미 처리가 진행 중이라 담당 부서에 취소 요청을 보냈습니다. 확인 후 안내드리겠습니다.';
                  } else {
                    content = '해당 요청이 정상적으로 취소되었습니다.';
                  }
                }

                const newAiMsg: ChatMessage = {
                  id: payload.messageId ? payload.messageId.toString() : Date.now().toString(),
                  variant: 'received',
                  content,
                  type: payload.options && payload.options.length > 0 ? 'QUICK_REPLY' : (payload.uiType || 'TEXT'),
                  meta: { ...(payload.meta || {}), options: payload.options },
                };
                return [...filtered, newAiMsg];
              });
            } else if (payload.type === 'STAFF_TYPING') {
              // 직원이 메시지 작성 중 → 타이핑 인디케이터 표시
              setIsStaffTyping(true);
            } else if (payload.type === 'STAFF_MESSAGE') {
              // 프론트데스크 직원이 보낸 메시지 → 고객 화면에 AI 채팅 버블 스타일로 실시간 표시
              setIsStaffTyping(false);
              const staffMsgId = payload.messageId ? payload.messageId.toString() : Date.now().toString();
              setMessages(prev => {
                // 중복 방지
                if (prev.some(m => m.id === staffMsgId)) return prev;

                // FRONT RequestCard는 유지 (삭제하지 않음)
                return [...prev, {
                  id: staffMsgId,
                  variant: 'received',
                  content: payload.content,
                  type: 'FALLBACK',
                }];
              });
            } else if (['NEW_REQUEST', 'STATUS_CHANGED', 'CANCEL_APPROVED', 'CANCEL_REJECTED', 'CANCEL_REQUEST_RECEIVED'].includes(payload.type)) {
              const progressMap: Record<string, number> = {
                'PENDING': 10, 'ESCALATED': 10, 'ASSIGNED': 50, 'IN_PROGRESS': 50, 'COMPLETED': 100, 'CANCELLED': 0
              };
              const isCancelled = payload.status === 'CANCELLED';
              const isCancelPending = payload.type === 'CANCEL_REQUEST_RECEIVED';

              // Set Active Requests for Status Bar
              setActiveRequests(prev => {
                const filtered = prev.filter(r => r.requestId !== payload.requestId);

                // CANCELLED → 즉시 제거
                if (payload.status === 'CANCELLED') return filtered;

                // COMPLETED → 상태바에 유지 (RequestStatusBar 내부 3초 타이머로 fade-out)
                // 이후 3.5초 뒤에 배열에서도 제거
                return [...filtered, {
                  requestId: payload.requestId,
                  domainCode: payload.domainCode || 'UNKNOWN',
                  summary: payload.summary,
                  status: isCancelPending ? 'CANCEL_PENDING' : payload.status,
                  entities: payload.entities,
                  progress: progressMap[payload.status] || 0
                }];
              });

              // COMPLETED 3.5초 후 activeRequests에서 완전 제거 (RequestStatusBar 3초 fade-out 보장)
              if (payload.status === 'COMPLETED') {
                setTimeout(() => {
                  setActiveRequests(prev => prev.filter(r => r.requestId !== payload.requestId));
                }, 3500);
              }

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
                  cancelPending: isCancelPending,
                  cancelReason: payload.cancelReason,
                  cancelledAt: payload.status === 'CANCELLED' ? new Date().toISOString() : undefined,
                  createdAt: payload.createdAt || new Date().toISOString()
                }
              };

              // COMPLETED는 ChatEndCard(FEEDBACK)로 처리
              if (payload.status !== 'COMPLETED') {
                // FRONT/EMERGENCY 도메인 카드는 제자리에서 상태만 업데이트 (제거/재생성 방지)
                const isInPlaceDomain = payload.domainCode === 'FRONT' || payload.domainCode === 'EMERGENCY';

                setMessages(prev => {
                  const existingIdx = prev.findIndex(m => m.id === `request-${payload.requestId}` || m.meta?.requestId === payload.requestId);
                  const existingMeta = existingIdx >= 0 ? (prev[existingIdx].meta || {}) : {};
                  const existingGrace = existingMeta.graceRemaining || 0;

                  if (isInPlaceDomain && existingIdx >= 0) {
                    // FRONT/EMERGENCY: 제자리에서 상태만 업데이트 (카드 위치/보더 유지)
                    const updated = [...prev];
                    updated[existingIdx] = {
                      ...updated[existingIdx],
                      meta: {
                        ...updated[existingIdx].meta,
                        status: payload.status,
                        graceRemaining: 0,
                      }
                    };
                    return updated;
                  }

                  // 부서가 변경된 경우: 기존 카드는 유지하고 새 카드를 하단에 추가
                  const existingDomain = existingMeta.domainCode;
                  const isDeptChanged = existingIdx >= 0 && existingDomain && existingDomain !== payload.domainCode;

                  if (isDeptChanged) {
                    // 기존 FRONT 카드는 그대로 두고, 새 부서 카드를 하단에 추가
                    return [...prev, {
                      ...requestMsg,
                      id: `request-${payload.requestId}-${Date.now()}`,
                      meta: {
                        ...requestMsg.meta,
                        createdAt: new Date().toISOString(),
                        graceRemaining: 0
                      }
                    }];
                  }

                  // 같은 도메인 내 상태 변경: 기존 카드 교체
                  const filtered = prev.filter(m => m.meta?.requestId !== payload.requestId && m.id !== `request-${payload.requestId}`);

                  return [...filtered, {
                    ...requestMsg,
                    id: `request-${payload.requestId}-${Date.now()}`,
                    meta: {
                      ...requestMsg.meta,
                      entities: payload.entities || existingMeta.entities,
                      priority: payload.priority || existingMeta.priority,
                      cancelReason: payload.cancelReason || existingMeta.cancelReason,
                      cancelledAt: payload.status === 'CANCELLED' ? (existingMeta.cancelledAt || new Date().toISOString()) : undefined,
                      createdAt: existingMeta.createdAt || payload.createdAt || new Date().toISOString(),
                      graceRemaining: payload.type === 'NEW_REQUEST' ? payload.graceRemaining : (payload.status === 'CANCELLED' ? 0 : existingGrace)
                    }
                  }];
                });
              } else {
                // COMPLETED: 도메인별 분기
                const isFrontConsultation = payload.domainCode === 'FRONT';
                setMessages(prev => {
                  const cardId = `system-feedback-${payload.requestId}`;
                  if (prev.some(m => m.id === cardId)) return prev;

                  return [...prev, {
                    id: cardId,
                    variant: 'received' as const,
                    // FRONT → 상담 완료 (직원 평가), 기타 → 요청 완료 (서비스 평가)
                    type: (isFrontConsultation ? 'CHAT_END' : 'FEEDBACK') as any,
                    content: '',
                    meta: {
                      requestId: payload.requestId,
                      summary: payload.summary || '',
                      domainCode: payload.domainCode || '',
                      completedAt: new Date().toISOString(),
                    }
                  }];
                });
              }

              // --- System messages for cancel flow ---
              let hasCancelEvent = false;
              if (payload.type === 'CANCEL_APPROVED' && payload.status === 'CANCELLED') {
                // 고객이 요청한 취소를 관리자가 승인한 경우
                cancelEventsBatch.current.add('GUEST_CANCEL_APPROVED');
                hasCancelEvent = true;
              } else if (payload.type === 'STATUS_CHANGED' && payload.status === 'CANCELLED') {
                if (payload.cancelReason === 'REPLACED') {
                  // System auto-cancel due to replace, do not show system message
                } else if (payload.initiatedBy === 'STAFF') {
                  // 관리자가 직접 강제 취소한 경우
                  cancelEventsBatch.current.add('STAFF_SUCCESS');
                  hasCancelEvent = true;
                } else {
                  // 고객이 직접 취소한 경우 (PENDING 상태에서 즉시 취소)
                  cancelEventsBatch.current.add('SUCCESS');
                  hasCancelEvent = true;
                }
              }
              if (payload.type === 'CANCEL_REQUEST_RECEIVED') {
                cancelEventsBatch.current.add('PENDING');
                hasCancelEvent = true;
              }

              if (hasCancelEvent) {
                if (cancelBatchTimer.current) clearTimeout(cancelBatchTimer.current);
                
                cancelBatchTimer.current = setTimeout(() => {
                  const hasSuccess = cancelEventsBatch.current.has('SUCCESS');
                  const hasStaffSuccess = cancelEventsBatch.current.has('STAFF_SUCCESS');
                  const hasGuestApproved = cancelEventsBatch.current.has('GUEST_CANCEL_APPROVED');
                  const hasPending = cancelEventsBatch.current.has('PENDING');
                  cancelEventsBatch.current.clear();

                  setMessages(prev => {
                    const msgId = `system-cancel-batch-${Date.now()}`;
                    
                    let content = '';
                    if (hasStaffSuccess) {
                      // 직원/관리자가 강제 취소한 경우 (AI_RESPONSE 없음 → 여기서 안내)
                      content = '죄송합니다. 현재 해당 서비스 제공이 일시적으로 어려워 요청이 취소되었습니다. 도움이 필요하시면 프런트로 연락 부탁드립니다.';
                    } else if (hasGuestApproved) {
                      // 관리자가 고객 취소를 승인한 경우 (AI_RESPONSE 없음 → 여기서 안내)
                      content = '해당 요청이 정상적으로 취소되었습니다.';
                    }
                    // SUCCESS / PENDING 은 AI_RESPONSE 핸들러에서 이미 메시지를 표시하므로 생략

                    if (!content) return prev;

                    return [...prev, {
                      id: msgId,
                      variant: 'received',
                      type: 'TEXT',
                      content: content,
                    }];
                  });
                }, 600); // 모든 카드가 도착한 후 렌더링되게 보장
              }

              if (payload.status === 'COMPLETED') {
                setTimeout(() => {
                  setMessages(prev => {
                    const msgId = `system-feedback-${payload.requestId}`;
                    if (prev.some(m => m.id === msgId)) return prev;
                    // Remove the original RequestCard for this requestId
                    const filtered = prev.filter(m =>
                      !(m.type === 'REQUEST_CARD' && m.meta?.requestId === payload.requestId)
                    );
                    return [...filtered, {
                      id: msgId,
                      variant: 'received',
                      type: 'FEEDBACK',
                      content: '',
                      meta: {
                        requestId: payload.requestId,
                        summary: payload.summary || '',
                        domainCode: payload.domainCode || '',
                        completedAt: new Date().toISOString()
                      }
                    }];
                  });
                }, 1000);
              }

              // CANCEL_REJECTED 처리: 제네릭 메시지 대신 관리자가 입력한 반려 사유가
              // STAFF_MESSAGE로 별도 전송되므로, 여기서는 시스템 메시지를 생략합니다.
              // (반려 사유가 없는 경우에만 기본 안내 표시)
              if (payload.type === 'CANCEL_REJECTED') {
                // 반려 사유(STAFF_MESSAGE)가 0.5초 내로 도착하지 않으면 기본 메시지 표시
                const rejectFallbackTimer = setTimeout(() => {
                  setMessages(prev => {
                    // 이미 STAFF_MESSAGE로 반려 사유가 도착했는지 확인
                    const hasRejectReason = prev.some(m =>
                      m.type === 'TEXT' && m.content?.includes('[취소 반려]')
                      && prev.indexOf(m) > prev.length - 5 // 최근 5개 메시지 내
                    );
                    if (hasRejectReason) return prev;

                    const msgId = `system-cancel-reject-${payload.requestId}`;
                    if (prev.some(m => m.id === msgId)) return prev;
                    return [...prev, {
                      id: msgId,
                      variant: 'received',
                      type: 'TEXT',
                      content: '안내: 요청하신 사항은 이미 진행 중이어서 취소가 어렵습니다. 추가적인 문의사항은 프런트로 연락 부탁드립니다.',
                    }];
                  });
                }, 800);
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

    // 언어 미러링: 고객 입력에 한글이 있으면 ko, 없으면 en으로 전체 UI 테마 즉시 변경
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
    setLanguage(hasKorean ? 'ko' : 'en');

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

    // 상담사 연결 중이면 AI Progress 표시 안 함 (상담사 typingDots만 표시)
    // [수정] 백엔드의 isStaffHandlingRoom 로직과 동일하게 IN_PROGRESS (또는 ASSIGNED) 상태일 때만 직원 연결로 간주
    // (PENDING 상태로 방치된 중복 FRONT 요청이 있을 때 애니메이션이 영구 차단되는 현상 방지)
    const isStaffConnected = activeRequests.some(r => r.domainCode === 'FRONT' && (r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED'));

    if (!isStaffConnected) {
      setIsTyping(true);

      // 즉시 AI Progress 표시 (백엔드 응답 전에 애니메이션 먼저 보여줌)
      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== 'AI_PROGRESS');
        return [...filtered, {
          id: 'ai-progress',
          variant: 'received',
          type: 'AI_PROGRESS',
          content: '',
          meta: { domains: [] }
        }];
      });
    }

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

  // 6. Rate Request Action (피드백 별점)
  const rateRequest = async (requestId: number, rating: number) => {
    if (!roomNo) return;
    try {
      const response = await fetch(`/api/chat/${roomNo}/requests/${requestId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      if (!response.ok) {
        console.error('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  // 7. Handle Pill Selection
  const handlePillSelect = (msgId: string, option: string) => {
    sendMessage(option);
    setMessages(prev => prev.map(m => 
      m.id === msgId 
        ? { ...m, meta: { ...m.meta, selectedOption: option, pillDisabled: true } }
        : m
    ));
  };

  return {
    messages,
    isTyping,
    isStaffTyping,
    sendMessage,
    activeRequests,
    cancelRequest,
    confirmRequest,
    rateRequest,
    stopMessage,
    handlePillSelect
  };
}
