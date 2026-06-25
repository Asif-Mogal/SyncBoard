package com.syncboard.config;

import com.syncboard.service.BoardPersistenceService;
import com.syncboard.service.RedisPubSubService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final BoardPersistenceService persistenceService;
    private final RedisPubSubService pubSubService;

    public WebSocketEventListener(BoardPersistenceService persistenceService, RedisPubSubService pubSubService) {
        this.persistenceService = persistenceService;
        this.pubSubService = pubSubService;
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        
        if (sessionAttributes != null) {
            String username = (String) sessionAttributes.get("username");
            String roomId = (String) sessionAttributes.get("roomId");
            
            if (username != null && roomId != null) {
                log.info("User '{}' disconnected from room '{}'", username, roomId);
                persistenceService.removeActiveUser(roomId, username);
                
                List<String> activeUsers = persistenceService.getActiveUsers(roomId);
                pubSubService.publishUsers(roomId, activeUsers);
            }
        }
    }
}
