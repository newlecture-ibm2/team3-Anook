'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

import {
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  Wrench,
  Home,
  Utensils,
  ConciergeBell,
  List,
  Database,
  Target,
  User,
  History,
  MessageSquare,
  Users,
  Monitor,
  Layers,
  FileSearch,
  FileText
} from 'lucide-react';

export interface SidebarProps {
  role?: 'admin' | 'staff' | 'guest' | 'housekeeping' | 'facility' | 'fb' | 'concierge' | 'front-desk' | 'emergency';
  className?: string;
  fakePathname?: string;
  onMenuClick?: (e: React.MouseEvent, href: string) => void;
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive?: boolean;
  isDanger?: boolean;
  onClick?: (e: React.MouseEvent, href: string) => void;
}

function SidebarItem({ icon: Icon, label, href, isActive = false, isDanger = false, onClick }: SidebarItemProps) {
  let itemStyle = styles.default;
  if (isActive) {
    itemStyle = styles.selected;
  }
  if (isDanger) {
    itemStyle = styles.danger;
  }

  return (
    <Link
      href={href}
      className={`${styles.item} ${itemStyle}`}
      onClick={(e) => onClick && onClick(e, href)}
    >
      <Icon className={styles.icon} />
      <span className={styles.label}>{label}</span>
    </Link>
  );
}

export default function Sidebar({ role = 'admin', className = '', fakePathname, onMenuClick }: SidebarProps) {
  const actualPathname = usePathname() || '';
  const pathname = fakePathname || actualPathname;

  // 부서별 (하우스키핑, 식음료, 시설, 컨시어지) 메뉴 리스트
  const deptMenus = [
    {
      category: '',
      items: [
        { label: '내 작업 (My Tasks)', href: '/staff?view=my', icon: User },
        { label: '부서 전체 작업 (Dept Tasks)', href: '/staff', icon: Users }
      ]
    }
  ];

  const adminMenus = [
    {
      category: '',
      items: [
        { label: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: '프론트 데스크', href: '/admin/front-desk', icon: Monitor },
        { label: '하우스키핑', href: '/admin/housekeeping', icon: Home },
        { label: '식음료', href: '/admin/fb', icon: Utensils },
        { label: '시설', href: '/admin/facility', icon: Wrench },
        { label: '컨시어지', href: '/admin/concierge', icon: MessageSquare },
        { label: '긴급 대응', href: '/admin/emergency', icon: AlertTriangle },
      ]
    },
    {
      category: '요청 관리',
      items: [
        { label: '전체 요청', href: '/admin/all-requests', icon: Layers },
        { label: '채팅 히스토리', href: '/admin/chat-history', icon: History },
      ]
    },
    {
      category: 'AI 시스템',
      items: [
        { label: '학습 관리', href: '/admin/ai-training', icon: Target },
        { label: '지식 라이브러리', href: '/admin/rag', icon: Database },
        { label: 'AI 라우팅 로그', href: '/admin/ai-routing', icon: FileSearch },
      ]
    },
    {
      category: '운영 관리',
      items: [
        { label: '인수인계', href: '/admin/handover', icon: FileText },
        { label: '직원 관리', href: '/admin/staff-management', icon: Users },
      ]
    }
  ];

  const isDepartment = ['housekeeping', 'facility', 'fb', 'concierge'].includes(role);
  const menus = isDepartment ? deptMenus : adminMenus;

  const flatMenus = menus.flatMap(g => g.items);
  const activeMenu = flatMenus.reduce((bestMatch, menu) => {
    if (pathname === menu.href || pathname.startsWith(`${menu.href}/`)) {
      if (!bestMatch || menu.href.length > bestMatch.href.length) {
        return menu;
      }
    }
    return bestMatch;
  }, null as any);

  return (
    <aside
      className={`${styles.sidebar} ${className}`.trim()}
      style={{ height: 'calc(100vh - 65px)', overflowY: 'auto' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-16) 0', width: '100%' }}>
        {menus.map((group, groupIdx) => (
          <div key={groupIdx} style={{ marginBottom: group.category ? 'var(--space-8)' : '0' }}>
            {group.category && (
              <h4 style={{ 
                padding: 'var(--space-8) var(--space-16)', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--color-gray-500)',
                marginTop: 'var(--space-8)',
                marginBottom: 'var(--space-4)'
              }}>
                {group.category}
              </h4>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {group.items.map((menu) => {
                const isActive = activeMenu?.href === menu.href;
                return (
                  <SidebarItem
                    key={menu.href}
                    icon={menu.icon}
                    label={menu.label}
                    href={menu.href}
                    isActive={isActive}
                    onClick={onMenuClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
