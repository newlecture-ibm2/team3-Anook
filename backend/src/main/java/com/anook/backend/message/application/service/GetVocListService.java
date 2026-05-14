package com.anook.backend.message.application.service;

import com.anook.backend.message.application.dto.response.GetVocListResult;
import com.anook.backend.message.application.port.in.GetVocListUseCase;
import com.anook.backend.message.application.port.out.MessageRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GetVocListService implements GetVocListUseCase {

    private final MessageRepositoryPort messageRepositoryPort;

    @Override
    @Transactional(readOnly = true)
    public List<GetVocListResult> getVocList() {
        return messageRepositoryPort.findVocs().stream()
                .map(msg -> {
                    // 같은 방의 최근 메시지 중 AI가 보낸 가장 가까운 미래의 메시지 찾기
                    List<com.anook.backend.message.domain.model.Message> recent = 
                            messageRepositoryPort.findRecentByRoomNoAndGuestId(msg.getRoomNo(), msg.getGuestId(), 20);
                    
                    String aiReply = "분석 중...";
                    for (com.anook.backend.message.domain.model.Message r : recent) {
                        if (r.isFromAi() && r.getCreatedAt().isAfter(msg.getCreatedAt())) {
                            aiReply = r.getContent();
                        }
                    }

                    return new GetVocListResult(
                            msg.getId(),
                            msg.getRoomNo(),
                            msg.getGuestId(),
                            msg.getSentiment(),
                            msg.getContent(),
                            aiReply,
                            msg.getCreatedAt()
                    );
                })
                .toList();
    }
}
