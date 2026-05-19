import React, { useState, useEffect } from 'react';
import styles from './RequestCard.module.css';
import GlassButton from '@/components/ui/Button/GlassButton';
import Tag from '@/components/ui/StatusBadge/StatusBadge';
import { Monitor, Home, Utensils, Wrench, ConciergeBell, AlertTriangle, FileText } from 'lucide-react';
import { useTranslationApi } from '@/app/useTranslationApi';
import { useUiStore } from '@/stores/useUiStore';
import { useTranslation } from '@/app/useTranslation';

export interface RequestCardProps {
  requestId: number;
  domainCode: string;
  summary: string;
  entities?: Record<string, unknown>;
  status: string;
  progress: number;
  graceRemaining: number;
  priority: string;
  createdAt?: string;
  cancelledAt?: string;
  cancelPending?: boolean;
  cancelReason?: string;
  onCancel?: () => void;
  onModify?: () => void;
  onAccept?: () => void;
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  HK: Home,
  FB: Utensils,
  FACILITY: Wrench,
  CONCIERGE: ConciergeBell,
  FRONT: Monitor,
  EMERGENCY: AlertTriangle,
  UNKNOWN: FileText,
};

export default function RequestCard({
  requestId,
  domainCode,
  summary,
  entities,
  status,
  progress,
  graceRemaining,
  priority,
  createdAt,
  cancelledAt,
  cancelPending,
  cancelReason,
  onCancel,
  onModify,
  onAccept,
}: RequestCardProps) {

  const isUrgent = priority === 'URGENT';
  const isCancelled = status === 'CANCELLED';
  const isCancelPending = cancelPending === true;
  const isEscalatedChat = domainCode === 'FRONT' && entities?.intent === 'ESCALATION';
  const isInProgress = progress >= 50 && progress < 100 && !isCancelled;
  const isCompleted = progress >= 100 && !isCancelled;
  
  const { language: uiLanguage, chatLanguage } = useUiStore();
  const [targetLang, setTargetLang] = useState<string>(chatLanguage);

  useEffect(() => {
    // chatLanguage가 변경될 때마다 업데이트 (초기 렌더링 또는 스토어 변경 시)
    setTargetLang(chatLanguage);
  }, [chatLanguage]);

  const { translatedText: translatedSummary, isLoading: isTranslating } = useTranslationApi(summary, targetLang);
  const { t } = useTranslation();
  const DomainIcon = DOMAIN_ICONS[domainCode] || DOMAIN_ICONS['UNKNOWN'];
  const domainLabel = (t.guestChat?.progress?.domains as Record<string, string>)?.[domainCode] || domainCode;
  const bgClass = styles[`bg${domainCode}`] || styles.bgUNKNOWN;
  const cardBgClass = styles[`cardBg${domainCode}`] || styles.cardBgUNKNOWN;

  const DOMAIN_TIMER_COLORS: Record<string, string> = {
    HK: 'var(--color-dept-hk-text)',
    FB: 'var(--color-dept-fb-text)',
    FACILITY: 'var(--color-dept-facility-text)',
    CONCIERGE: 'var(--color-dept-concierge-text)',
    FRONT: 'var(--color-dept-front-text)',
    EMERGENCY: 'var(--color-dept-emergency-text)',
  };
  const timerColor = DOMAIN_TIMER_COLORS[domainCode] || 'var(--color-primary)';
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(graceRemaining);

  // Format summary to hide internal notes from guest
  const baseSummary = translatedSummary || summary;
  
  let displaySummary = '';
  if (isTranslating) {
    displaySummary = t.cardUI?.message?.translating || 'Translating...';
  } else {
    displaySummary = baseSummary.includes('[직원 인수인계]') || baseSummary.includes('[프론트 연결]') || baseSummary.includes('미학습 정보') || isEscalatedChat
      ? (t.cardUI?.message?.escalationRequest || 'Front desk staff connection request')
      : baseSummary;
  }
  
  const getFixedTitle = () => {
    if (isTranslating || isEscalatedChat || baseSummary.includes('프론트 연결')) {
      return displaySummary;
    }
    const intent = entities?.intent as string | undefined;
    switch (domainCode) {
      case 'FB':
        if (intent === 'DINING') return '룸서비스 음식 주문';
        if (intent === 'AMENITY') return '객실 어메니티 요청';
        return displaySummary;
      case 'CONCIERGE':
        if (intent === 'TAXI') return '택시 호출 예약';
        if (intent === 'LUGGAGE_STORAGE') return '수하물 보관/찾기';
        if (intent === 'RESTAURANT') return '식당 예약';
        if (intent === 'WAKE_UP_CALL') return '모닝콜 예약';
        if (intent === 'POSTAL_SERVICE') return '우편물 발송 대행';
        return displaySummary;
      case 'FACILITY':
      case 'HK':
        return displaySummary;
      default:
        return displaySummary.split('(')[0].trim();
    }
  };

  let finalTitle = getFixedTitle();
  if (isCancelled) {
    finalTitle += ` ${t.cardUI?.message?.cancelledCard || '취소됨'}`;
  }

  useEffect(() => {
    // graceRemaining === -1: 고객 확인 대기 모드 (FB/CONCIERGE) → 타이머 없이 버튼 정적 표시
    if (graceRemaining <= 0 || isCancelled) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(graceRemaining);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [graceRemaining, isCancelled]);

  // graceRemaining === -1: 정적 버튼 (타이머 없이 항시 표시)
  // graceRemaining > 0: 타이머 카운트다운 중 버튼 표시
  const isStaticConfirm = graceRemaining === -1 && !isUrgent && !isCancelled;
  const showButtons = isStaticConfirm || (!isUrgent && !isCancelled && timeLeft > 0);

  // Render entities description
  const renderDetails = () => {
    if (!entities) return null;
    
    // 심플한 요청(HK, FACILITY, EMERGENCY, FRONT)은 메인 타이틀(summary)만 보여주고 디테일은 생략
    if (domainCode === 'HK' || domainCode === 'FACILITY' || domainCode === 'EMERGENCY' || domainCode === 'FRONT') return null;

    const l = t.ticketUI?.entityLabels || {};
    const parts: string[] = [];
    
    if (entities.intent === 'TAXI') {
      if (entities.time) parts.push(`${l.time || '시간'}: ${entities.time}`);
      if (entities.destination) parts.push(`${l.dest || '목적지'}: ${entities.destination}`);
      if (entities.passenger_count) parts.push(`${l.pax || '인원'}: ${entities.passenger_count}${l.paxUnit || ''}`);
    } else if (entities.intent === 'RESTAURANT' || entities.intent === 'RESERVATION') {
      if (entities.restaurant_name) parts.push(`${l.rest || '식당'}: ${entities.restaurant_name}`);
      if (entities.target) parts.push(`${l.target || '대상'}: ${entities.target}`);
      if (entities.time) parts.push(`${l.time || '시간'}: ${entities.time}`);
      if (entities.party_size) parts.push(`${l.pax || '인원'}: ${entities.party_size}${l.paxUnit || ''}`);
    } else if (entities.intent === 'LUGGAGE_STORAGE') {
      if (entities.action) parts.push(`${l.req || '요청'}: ${entities.action === 'store' ? (l.store || '보관') : (l.pickup || '찾기')}`);
      if (entities.count) parts.push(`${l.count || '수량'}: ${entities.count}${l.countUnit || ''}`);
    } else if (entities.intent === 'DELIVERY' || entities.intent === 'POSTAL_SERVICE') {
      if (entities.item) parts.push(`${l.item || '물품'}: ${entities.item}`);
      if (entities.store_name) parts.push(`${l.vendor || '업체'}: ${entities.store_name}`);
      if (entities.time) parts.push(`${l.time || '시간'}: ${entities.time}`);
      if (entities.destination) parts.push(`${l.dest || '도착지'}: ${entities.destination}`);
    } else if (entities.intent === 'WAKE_UP_CALL') {
      if (entities.time) parts.push(`${l.time || '시간'}: ${entities.time}`);
    } else if (entities.intent === 'MEDICAL_INFO') {
      if (entities.type) parts.push(`${l.type || '분류'}: ${entities.type}`);
      if (entities.symptom) parts.push(`${l.symptom || '증상'}: ${entities.symptom}`);
    } else if (entities.intent === 'TOUR_INFO') {
      if (entities.category) parts.push(`${l.type || '분류'}: ${entities.category}`);
      if (entities.area) parts.push(`${l.area || '지역'}: ${entities.area}`);
    } else {
      if (Array.isArray(entities.menu_items)) {
        entities.menu_items.forEach((it: any) => {
          parts.push(`- ${it.name} ${it.quantity ? `×${it.quantity}` : ''}`.trim());
        });
      } else if (Array.isArray(entities.items)) {
        entities.items.forEach((it: any) => {
          parts.push(`- ${it.item} ${it.count ? `×${it.count}` : ''}`.trim());
        });
      } else if (entities.item) {
        parts.push(`- ${entities.item} ${entities.count ? `×${entities.count}` : ''}`.trim());
      }
  
      if (Array.isArray(entities.tasks)) {
        entities.tasks.forEach((t: string) => parts.push(`- ${t}`));
      }
      
      if (parts.length === 0) {
        if (entities.menu) {
          parts.push(`- ${entities.menu} ${entities.count ? `×${entities.count}` : ''}`.trim());
        }
      }

      if (entities.symptom) {
        parts.push(`${l.content || '내용'}: ${entities.symptom}`);
      }
    }
    
    return parts.length > 0 ? parts.join('\n') : null;
  };

  const detailsText = renderDetails();

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className={`glass-panel ${styles.card} ${cardBgClass} ${isCancelled ? styles.cancelledCard : ''} ${isCancelPending ? styles.cancelPendingCard : ''} ${isInProgress ? styles.inProgressCard : ''} ${isCompleted ? styles.completedCard : ''}`}>
      <div className={styles.cardLayout}>
        {/* Left Column: Icon or Timer */}
        <div className={styles.leftColumn}>
          {showButtons && !isStaticConfirm ? (
            <div className={`${styles.timerContainer} ${bgClass}`} style={{ '--timer-color': timerColor } as React.CSSProperties}>
              <svg viewBox="0 0 36 36" className={styles.circularSvg}>
                <path
                  className={styles.circleProgress}
                  strokeDasharray="100"
                  strokeDashoffset={100 - (timeLeft / Math.max(graceRemaining, 1)) * 100}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className={styles.timerText}>{timeLeft}</div>
            </div>
          ) : (
            <div className={`${styles.iconContainer} ${bgClass}`}>
              <DomainIcon size={20} />
            </div>
          )}
        </div>

        {/* Right Column: Content */}
        <div className={styles.rightColumn}>
          <div className={styles.content}>
            <div className={styles.summaryRow}>
              <div className={styles.summary}>{finalTitle}</div>
              <div className={styles.timeLabel}>{formatTime(isCancelled && cancelledAt ? cancelledAt : createdAt)}</div>
            </div>
          </div>

          {detailsText && (
            <div className={styles.detailsText}>
              {detailsText}
            </div>
          )}

          <div className={`${styles.completionMessage} ${isCancelled ? styles.cancelledText : ''}`}>
            {isCancelled ? (
              <>{t.cardUI?.message?.cancelledCard || '요청이 취소되었습니다'}</>
            ) : showButtons && isStaticConfirm ? (
              <>{t.cardUI?.message?.confirmGuide || '확인 후 진행 버튼을 눌러주세요.'}</>
            ) : showButtons ? (
              <>{t.cardUI?.message?.autoAcceptGuide || '요청 내용을 확인해 주세요. 잠시 후 자동 전달됩니다.'}</>
            ) : isCancelPending ? (
              <>{t.cardUI?.message?.cancelPendingShort || '취소 요청 확인 중'}</>
            ) : isEscalatedChat ? (
              <>{t.cardUI?.message?.escalated || '직원이 응대할 예정입니다'}</>
            ) : (
              <>{(t.cardUI?.message?.forwarded || '{team} 팀에 전달되었습니다').replace('{team}', domainLabel)}</>
            )}
          </div>
        </div>
      </div>

      {/* Buttons — full width below cardLayout */}
      <div className={`${styles.buttonGroup} ${!showButtons ? styles.hiddenButtons : ''}`}>
        <GlassButton variant="cancel" onClick={onCancel} fullWidth>{t.cardUI?.button?.cancel || '취소하기'}</GlassButton>
        <GlassButton variant="primary" domainCode={domainCode} onClick={onAccept} fullWidth>{t.cardUI?.button?.accept || '바로등록'}</GlassButton>
      </div>
    </div>
  );
}
