import { useState, useEffect, useCallback } from 'react';

interface ChatRoom {
  roomNo: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

interface ChatMessage {
  id: number;
  roomNo: string;
  senderType: string;
  content: string;
  createdAt: string;
}

export default function useChatHistory() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 객실 목록 가져오기
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoadingRooms(true);
        const res = await fetch('/api/admin/messages/rooms');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ChatRoom[] = await res.json();
        setRooms(data);
        // 첫 번째 객실 자동 선택
        if (data.length > 0 && !selectedRoom) {
          setSelectedRoom(data[0].roomNo);
        }
      } catch (err: any) {
        setError(err.message || '객실 목록 로딩 실패');
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  // 선택된 객실의 메시지 가져오기
  const fetchMessages = useCallback(async (roomNo: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/admin/messages/rooms/${roomNo}/messages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    } catch (err: any) {
      setError(err.message || '메시지 로딩 실패');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom);
    }
  }, [selectedRoom, fetchMessages]);

  const selectRoom = (roomNo: string) => {
    setSelectedRoom(roomNo);
  };

  return {
    rooms, messages, selectedRoom,
    loadingRooms, loadingMessages, error,
    selectRoom, fetchMessages,
  };
}
