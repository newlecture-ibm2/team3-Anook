'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tabs from '@/components/ui/Tab/Tabs';
import RequestCard from '@/components/ui/Card/RequestCard';
import Button from '@/components/ui/Button/Button';
import useFrontdeskRequests from '../useFrontdeskRequests';

import useEscalations from './useEscalations';
import CreateRequestModal from './_components/CreateRequestModal/CreateRequestModal';
import ApproveEscalationModal from './_components/ApproveEscalationModal/ApproveEscalationModal';
import RejectEscalationModal from './_components/RejectEscalationModal/RejectEscalationModal';
import ApproveCancellationModal from './_components/ApproveCancellationModal/ApproveCancellationModal';
import RejectCancellationModal from './_components/RejectCancellationModal/RejectCancellationModal';
import ChatPanel from './_components/ChatPanel/ChatPanel';
import RequestDetailPanel from './_components/RequestDetailPanel/RequestDetailPanel';
import RegisterTrainingModal from './_components/RegisterTrainingModal/RegisterTrainingModal';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';
import { useUiStore } from '@/stores/useUiStore';
import { useSSE } from '@/app/useSSE';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('active');
  const { requests, loading, error, refetch } = useFrontdeskRequests('FRONT');
  // 긴급대응(EMERGENCY) 부서 요청도 프론트 데스크에서 최우선으로 표시
  const { requests: emergencyRequests, loading: emergLoading, refetch: emergRefetch } = useFrontdeskRequests('EMERGENCY');
  // 취소 승인 대기: 모든 부서의 취소 요청을 프론트에서 대신 처리하기 위해 전체 조회
  const { requests: allRequests, loading: allLoading, refetch: allRefetch } = useFrontdeskRequests(undefined, '', 'all', true);

  // FRONT + EMERGENCY 요청 병합 (중복 제거)
  const mergedRequests = [...requests, ...emergencyRequests.filter(er => !requests.some(r => r.id === er.id))];

  // 우선순위 정렬 가중치: EMERGENCY > NORMAL
  const priorityWeight = (p: string) => p === 'EMERGENCY' ? 0 : 1;

  const sortByPriority = <T extends { priority: string; createdAt: string }>(list: T[]) =>
    list.sort((a, b) => {
      const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (pw !== 0) return pw;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pending = sortByPriority(mergedRequests.filter(r => r.status === 'PENDING' || r.status === 'ESCALATED'));
  const inProgress = sortByPriority(mergedRequests.filter(r => (r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS') && !r.cancelRequested));
  // 모든 부서의 취소 대기 건 (프론트 데스크가 대신 처리)
  const cancelPending = allRequests.filter(r => r.cancelRequested);
  const completed = sortByPriority(mergedRequests.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED'));

  const { escalations } = useEscalations();
  const nonEmergencyEscalations = escalations.filter(r => r.priority !== 'EMERGENCY');
  const { t } = useTranslation();

  const { activeModal, closeModal } = useUiStore();
  // Chat Modal 상태
  const [activeChatRoom, setActiveChatRoom] = useState<{ roomNumber: string, requestId: number, status: string, summary?: string, initialMessage?: string } | null>(null);
  // RAG 등록 플로우 진행 중 플래그 (자동 카드 선택 방지)
  const [isRagFlowActive, setIsRagFlowActive] = useState(false);
  // 승인/반려 모달 상태
  const [approveTarget, setApproveTarget] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  // 새 메시지 알림 (레드닷) 상태
  const [newMessageRequestIds, setNewMessageRequestIds] = useState<Set<number>>(new Set());
  const { subscribe } = useSSE();
  const activeChatRoomRef = useRef(activeChatRoom);
  useEffect(() => { activeChatRoomRef.current = activeChatRoom; }, [activeChatRoom]);

  // 각 방의 마지막 고객 메시지 (카드 subtitle용)
  const [lastGuestMessages, setLastGuestMessages] = useState<Record<string, string>>({});
  const fetchedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const rooms = [...new Set(mergedRequests.map(r => String(r.roomNo)))];
    const newRooms = rooms.filter(r => !fetchedRoomsRef.current.has(r));
    if (newRooms.length === 0) return;

    newRooms.forEach(async (roomNo) => {
      fetchedRoomsRef.current.add(roomNo);
      try {
        const res = await fetch(`/api/frontdesk/messages/rooms/${roomNo}/messages`);
        if (!res.ok) return;
        const msgs = await res.json();
        const lastGuest = [...msgs].reverse().find((m: any) => m.senderType === 'GUEST');
        if (lastGuest) {
          setLastGuestMessages(prev => ({ ...prev, [roomNo]: lastGuest.content }));
        }
      } catch { /* ignore */ }
    });
  }, [mergedRequests]);

  // inProgress 배열의 최신 상태를 유지하기 위한 ref (useEffect 내 클로저 문제 방지)
  const inProgressRef = useRef(inProgress);
  useEffect(() => {
    inProgressRef.current = inProgress;
  }, [inProgress]);

  // IN_PROGRESS 방들의 고객 메시지 감지 (이제 각 방별로 구독하지 않고 frontdesk 채널 1개만 구독)
  useEffect(() => {
    const unsub = subscribe('/topic/frontdesk', (data: unknown) => {
      const payload = data as Record<string, unknown>;
      const type = payload.type as string;
      const roomNo = payload.roomNo as string;
      
      // 고객이 보낸 메시지인 경우 레드닷 + 마지막 메시지 갱신
      if ((type === 'GUEST_MESSAGE' || type === 'AI_RESPONSE') && roomNo) {
        if (type === 'GUEST_MESSAGE' && payload.content) {
          setLastGuestMessages(prev => ({ ...prev, [String(roomNo)]: String(payload.content) }));
        }
        
        // 해당 roomNo에 속한 모든 inProgress 요청 찾기 (항상 최신 상태 참조)
        const relatedRequests = inProgressRef.current.filter(r => String(r.roomNo) === String(roomNo));
        relatedRequests.forEach(req => {
          // 현재 열린 채팅방이면 레드닷 표시하지 않음
          if (activeChatRoomRef.current?.requestId === req.id) return;
          setNewMessageRequestIds(prev => {
            const next = new Set(prev);
            next.add(req.id);
            return next;
          });
        });
      }
    });

    return () => {
      unsub();
    };
  }, [subscribe]);

  // 긴급(EMERGENCY) 요청 자동 선택 로직
  const seenEmergencyRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const emergencyReqs = [...pending, ...inProgress].filter(r => r.priority === 'EMERGENCY');
    let targetReq = null;

    for (const req of emergencyReqs) {
      if (!seenEmergencyRef.current.has(req.id)) {
        if (!targetReq) {
          targetReq = req;
        }
        seenEmergencyRef.current.add(req.id);
      }
    }

    if (targetReq) {
      setActiveTab('active');
      setActiveChatRoom({
        roomNumber: targetReq.roomNo,
        requestId: targetReq.id,
        status: targetReq.status,
        summary: targetReq.summary
      });
    }
  }, [pending, inProgress]);

  const mapStatusVariant = (status: string): 'red' | 'purple' | 'green' | 'gray' => {
    if (status === 'PENDING' || status === 'ESCALATED') return 'red';
    if (status === 'IN_PROGRESS') return 'green';
    if (status === 'COMPLETED' || status === 'CANCELLED') return 'gray';
    return 'gray';
  };

  const mapStatusText = (status: string): string => {
    if (status === 'PENDING') return t.frontdeskPage.frontDesk.status.pending;
    if (status === 'IN_PROGRESS') return t.frontdeskPage.frontDesk.status.inProgress;
    if (status === 'COMPLETED' || status === 'CANCELLED') return t.frontdeskPage.frontDesk.status.completed;
    if (status === 'ESCALATED') return t.frontdeskPage.frontDesk.status.escalated;
    return status;
  };


  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/frontdesk/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (refetch) refetch();
        if (emergRefetch) emergRefetch();
        if (allRefetch) allRefetch();
        if (activeChatRoom?.requestId === id) {
          // COMPLETED일 때도 ChatPanel을 유지 (RAG 등록 모달 플로우를 위해)
          // ChatPanel의 onClose 콜백에서 setActiveChatRoom(null)이 호출됨
          setActiveChatRoom(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getFilteredRequests = () => {
    if (activeTab === 'active') {
      const activeList = [...pending, ...inProgress];
      // 우선순위 → 최신순 정렬
      return activeList.sort((a, b) => {
        const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
        if (pw !== 0) return pw;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    if (activeTab === 'completed') return completed;
    return [];
  };
  const filteredRequests = getFilteredRequests();

  useEffect(() => {
    // RAG 등록 플로우 진행 중에는 자동 카드 선택을 건너뜀 (모달이 닫힌 후 onClose에서 처리)
    if (isRagFlowActive) return;
    if (filteredRequests.length > 0) {
      const exists = activeChatRoom && filteredRequests.some(req => req.id === activeChatRoom.requestId);
      if (!exists) {
        const req = filteredRequests[0];
        setActiveChatRoom({
          roomNumber: req.roomNo.toString(),
          requestId: req.id,
          status: req.status,
          summary: req.summary,
          initialMessage: req.rawText || req.summary
        });
        setDetailTarget(null);
      }
    } else if (activeChatRoom) {
      setActiveChatRoom(null);
    }
  }, [activeTab, pending, inProgress, completed, activeChatRoom, isRagFlowActive]);


  const handleCardClick = (requestId: number) => {
    setDetailTarget(requestId);
  };


  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const [cancelApproveTarget, setCancelApproveTarget] = useState<number | null>(null);
  const [cancelRejectTarget, setCancelRejectTarget] = useState<number | null>(null);
  const [trainingTarget, setTrainingTarget] = useState<any | null>(null);

  // Local state to track requests that have already been added to RAG (since there is no backend flag yet)
  const [registeredRagIds, setRegisteredRagIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('registeredRagIds');
    if (saved) {
      setRegisteredRagIds(new Set(JSON.parse(saved)));
    }

    const handleRagRegistered = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setRegisteredRagIds(prev => {
        const newSet = new Set(prev);
        newSet.add(customEvent.detail);
        return newSet;
      });
    };

    window.addEventListener('ragRegistered', handleRagRegistered);
    return () => {
      window.removeEventListener('ragRegistered', handleRagRegistered);
    };
  }, []);

  const getPrimaryActionText = (req: any) => {
    return undefined;
  };

  const getSecondaryActionText = (req: any) => {
    return undefined;
  };

  return (
    <div className={styles.container}>
      {/* Content Section (Split Layout) */}
      <div className={styles.splitLayout}>
        {/* Left Pane: Request List */}
        <div className={styles.leftPane}>
          {/* Tabs inside left pane */}
          <div style={{ marginBottom: 'var(--space-16)' }}>
            <Tabs
              options={[
                { label: '진행 중', value: 'active', count: pending.length + inProgress.length },
                { label: '상담 완료', value: 'completed', count: completed.length }
              ]}
              activeValue={activeTab}
              onChange={(val) => setActiveTab(val || 'active')}
            />
          </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.common.loading}</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.common.error}: {error}</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.frontdeskPage.frontDesk.empty}</div>
        ) : (
          <div className={styles.cardGrid}>
            {filteredRequests.map(req => (
              <RequestCard
                key={req.id}
                roomNumber={req.roomNo}
                title={req.summary.replace(/^\[(?:프론트 연결|직원 인수인계)\]\s*/, '')}
                description={lastGuestMessages[String(req.roomNo)] || req.rawText || '요청 내용이 없습니다.'}
                statusText={mapStatusText(req.status)}
                statusVariant={mapStatusVariant(req.status)}
                createdAt={req.createdAt}
                isSelected={activeChatRoom?.requestId === req.id}
                primaryActionText={getPrimaryActionText(req)}
                secondaryActionText={getSecondaryActionText(req)}
                onPrimaryAction={() => {
                  if (activeTab === 'active') {
                    if (req.status === 'PENDING' || req.status === 'ESCALATED') {
                      handleStatusChange(req.id, 'IN_PROGRESS');
                      setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: 'IN_PROGRESS', summary: req.summary, initialMessage: req.rawText || req.summary });
                    } else if (req.status === 'IN_PROGRESS' || req.status === 'ASSIGNED') {
                      handleStatusChange(req.id, 'COMPLETED');
                      setActiveChatRoom(null);
                    }
                  } else if (activeTab === 'completed') {
                    setTrainingTarget(req);
                  }
                }}
                onSecondaryAction={
                  activeTab === 'completed' ? () => setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: req.status, summary: req.summary, initialMessage: req.rawText || req.summary }) :
                  undefined
                }
                reverseActions={true}
                onCardClick={() => {
                  setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: req.status, summary: req.summary, initialMessage: req.rawText || req.summary });
                  setDetailTarget(null);
                  // 레드닷 해제
                  setNewMessageRequestIds(prev => {
                    const next = new Set(prev);
                    next.delete(req.id);
                    return next;
                  });
                }}
                // custom props to pass to ChatModal through RequestCard
                requestId={req.id}
                status={req.status}
                onStatusChange={handleStatusChange}
                hasNewMessage={newMessageRequestIds.has(req.id)}
                isEmergency={req.priority === 'EMERGENCY'}
              />
            ))}
          </div>
        )}
        </div>

        {/* Right Pane: Chat Window */}
        <div className={styles.rightPane}>
          {activeChatRoom ? (() => {
            const activeReq = [...pending, ...inProgress, ...completed].find(r => r.id === activeChatRoom.requestId);
            return (
              <ChatPanel
                roomNumber={activeChatRoom.roomNumber}
                requestId={activeChatRoom.requestId}
                status={activeReq?.status || activeChatRoom.status}
                summary={activeReq?.summary || activeChatRoom.summary}
                initialMessage={activeChatRoom.initialMessage}
                onStatusChange={handleStatusChange}
                autoComplete={false}
              onClose={() => { setIsRagFlowActive(false); setActiveChatRoom(null); }}
              showRagButton={activeTab === 'completed' && !registeredRagIds.has(activeChatRoom.requestId)}
              onRagRegister={() => {
                const req = [...pending, ...inProgress, ...completed].find((r: any) => r.id === activeChatRoom.requestId);
                if (req) setTrainingTarget(req);
              }}
              isEmergency={activeReq?.priority === 'EMERGENCY'}
              onRagFlowChange={setIsRagFlowActive}
              />
            );
          })() : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
              대화할 요청을 선택해주세요
            </div>
          )}
        </div>

        {/* Third Pane: Request Detail (요청 상세) */}
        {(activeChatRoom || detailTarget !== null) && (
          <div className={styles.detailPane}>
            <RequestDetailPanel
              requestId={(activeChatRoom ? activeChatRoom.requestId : detailTarget)!}
              onUpdate={() => refetch && refetch()}
              onClose={() => {
                setActiveChatRoom(null);
                setDetailTarget(null);
              }}
            />
          </div>
        )}
      </div>

      {/* 요청 생성 모달 */}
      <CreateRequestModal
        isOpen={activeModal === 'createRequest'}
        onClose={closeModal}
        onSuccess={() => refetch && refetch()}
      />

      {approveTarget !== null && (
        <ApproveEscalationModal
          isOpen={true}
          onClose={() => setApproveTarget(null)}
          requestId={approveTarget}
          onSuccess={() => refetch && refetch()}
        />
      )}

      {/* 에스컬레이션 반려 모달 */}
      {rejectTarget !== null && (
        <RejectEscalationModal
          isOpen={true}
          onClose={() => setRejectTarget(null)}
          requestId={rejectTarget}
          onSuccess={() => refetch && refetch()}
        />
      )}

      {/* 취소 승인 모달 */}
      {cancelApproveTarget !== null && (
        <ApproveCancellationModal
          isOpen={true}
          onClose={() => setCancelApproveTarget(null)}
          requestId={cancelApproveTarget}
          onSuccess={() => { refetch && refetch(); allRefetch && allRefetch(); }}
        />
      )}

      {/* 취소 반려 모달 */}
      {cancelRejectTarget !== null && (
        <RejectCancellationModal
          isOpen={true}
          onClose={() => setCancelRejectTarget(null)}
          requestId={cancelRejectTarget}
          onSuccess={() => { refetch && refetch(); allRefetch && allRefetch(); }}
        />
      )}

      <RegisterTrainingModal
        isOpen={trainingTarget !== null}
        onClose={() => setTrainingTarget(null)}
        departmentId={trainingTarget?.departmentId}
        summary={trainingTarget?.summary}
        roomNo={trainingTarget?.roomNo?.toString()}
        requestId={trainingTarget?.id}
      />
    </div>
  );
}
