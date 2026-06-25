package com.syncboard.controller;

import com.syncboard.model.CursorPosition;
import com.syncboard.model.DrawAction;
import com.syncboard.service.BoardPersistenceService;
import com.syncboard.service.RedisPubSubService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class DrawWSController {

    private static final Logger log = LoggerFactory.getLogger(DrawWSController.class);

    private final RedisPubSubService pubSubService;
    private final BoardPersistenceService persistenceService;

    public DrawWSController(RedisPubSubService pubSubService, BoardPersistenceService persistenceService) {
        this.pubSubService = pubSubService;
        this.persistenceService = persistenceService;
    }

    @MessageMapping("/draw/{roomId}")
    public void handleDraw(@DestinationVariable String roomId, @Payload DrawAction action) {
        log.debug("Received drawing action for room {}: {}", roomId, action.getType());
        
        if ("CLEAR".equalsIgnoreCase(action.getType())) {
            persistenceService.clearCachedActions(roomId);
        } else {
            persistenceService.cacheAction(roomId, action);
        }
        
        pubSubService.publishDraw(roomId, action);
    }

    @MessageMapping("/cursor/{roomId}")
    public void handleCursor(@DestinationVariable String roomId, @Payload CursorPosition position) {
        persistenceService.addActiveUser(roomId, position.getUsername());
        pubSubService.publishCursor(roomId, position);
    }

    @MessageMapping("/join/{roomId}")
    public void handleJoin(@DestinationVariable String roomId, 
                           @Payload String username, 
                           SimpMessageHeaderAccessor headerAccessor) {
        log.info("User '{}' joined room '{}'", username, roomId);
        
        if (headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("username", username);
            headerAccessor.getSessionAttributes().put("roomId", roomId);
        }
        
        persistenceService.addActiveUser(roomId, username);
        
        List<String> activeUsers = persistenceService.getActiveUsers(roomId);
        pubSubService.publishUsers(roomId, activeUsers);
    }

    @MessageMapping("/leave/{roomId}")
    public void handleLeave(@DestinationVariable String roomId, @Payload String username) {
        log.info("User '{}' left room '{}'", username, roomId);
        persistenceService.removeActiveUser(roomId, username);
        
        List<String> activeUsers = persistenceService.getActiveUsers(roomId);
        pubSubService.publishUsers(roomId, activeUsers);
    }

    @MessageMapping("/undo/{roomId}")
    public void handleUndo(@DestinationVariable String roomId, @Payload String username) {
        log.info("Request to undo last action for user '{}' in room '{}'", username, roomId);
        String strokeId = persistenceService.undoLastAction(roomId, username);
        
        // Broadcast UNDO action containing the target strokeId to all room members
        DrawAction undoAction = new DrawAction();
        undoAction.setType("UNDO");
        undoAction.setUsername(username);
        undoAction.setStrokeId(strokeId);
        
        pubSubService.publishDraw(roomId, undoAction);
    }
}
