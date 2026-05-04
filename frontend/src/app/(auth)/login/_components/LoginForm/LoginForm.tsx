"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../login.module.css";
import { useLoginForm } from "../useLoginForm";
import { useUiStore } from "@/stores/useUiStore";
import Toast from "@/components/ui/Modal/Toast";

/**
 * 실제 로그인 폼 컴포넌트 (useSearchParams 사용)
 * 별도 파일로 분리하여 Suspense 경계를 명확히 함
 */
export default function LoginForm() {
  const { pin, setPin, isLoading, error, handleLogin, performLogin } = useLoginForm();
  const searchParams = useSearchParams();
  const { showToast } = useUiStore();

  // QR 코드 자동 로그인 및 중복 로그인 에러 체크
  useEffect(() => {
    // 1. QR 코드 자동 로그인
    const code = searchParams.get("code");
    if (code) {
      setPin(code);
      performLogin(code);
    }

    // 2. 중복 로그인 에러 체크 (기존 UI 시스템의 showToast 활용)
    const errorParam = searchParams.get("error");
    if (errorParam === "DUPLICATE_LOGIN") {
      showToast(
        "다른 기기 접속 감지", 
        "error", 
        "다른 곳에서 로그인이 확인되어 현재 세션이 종료되었습니다."
      );
    }
  }, [searchParams, performLogin, setPin, showToast]);

  return (
    <div className={styles.container}>
      {/* 로그인 페이지 전용 토스트 컴포넌트 배치 */}
      <Toast />
      
      <div className={styles.loginCard}>
        <header className={styles.header}>
          <h1 className={styles.logo}>Aneuk</h1>
          <p className={styles.subtitle}>Welcome to Premium Service</p>
        </header>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label htmlFor="auth-code" className={styles.inputLabel}>
              PIN Code or Access Code
            </label>
            <input
              id="auth-code"
              type="text"
              placeholder="Enter PIN or Access Code"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={styles.pinInput}
              autoFocus
            />
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={isLoading || !pin}>
            {isLoading ? "Authenticating..." : "Start Service"}
          </button>
        </form>

        <footer className={styles.footer}>
          <p>© 2026 Aneuk Hotel Concierge Service</p>
        </footer>
      </div>
    </div>
  );
}
