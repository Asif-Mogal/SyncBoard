package com.syncboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.syncboard.model.CursorPosition;
import com.syncboard.model.DrawAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class RedisPubSubService implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(RedisPubSubService.class);

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public RedisPubSubService(RedisTemplate<String, Object> redisTemplate,
                              SimpMessagingTemplate messagingTemplate,
                              ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Publishes a drawing stroke action to the room's draw channel in Redis.
     */
    public void publishDraw(String roomId, DrawAction action) {
        String channel = "room:" + roomId + ":draw";
        redisTemplate.convertAndSend(channel, action);
    }

    /**
     * Publishes a cursor position update to the room's cursor channel in Redis.
     */
    public void publishCursor(String roomId, CursorPosition position) {
        String channel = "room:" + roomId + ":cursor";
        redisTemplate.convertAndSend(channel, position);
    }

    /**
     * Publishes active user updates to the room's users channel in Redis.
     */
    public void publishUsers(String roomId, Object usersList) {
        String channel = "room:" + roomId + ":users";
        redisTemplate.convertAndSend(channel, usersList);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
            String body = new String(message.getBody(), StandardCharsets.UTF_8);

            // Channel format: room:{roomId}:{draw|cursor|users}
            String[] parts = channel.split(":");
            if (parts.length < 3) {
                log.warn("Invalid Redis message channel format: {}", channel);
                return;
            }

            String roomId = parts[1];
            String type = parts[2];

            if ("draw".equals(type)) {
                DrawAction drawAction = objectMapper.readValue(body, DrawAction.class);
                messagingTemplate.convertAndSend("/topic/room/" + roomId, drawAction);
            } else if ("cursor".equals(type)) {
                CursorPosition cursorPosition = objectMapper.readValue(body, CursorPosition.class);
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/cursors", cursorPosition);
            } else if ("users".equals(type)) {
                Object users = objectMapper.readValue(body, Object.class);
                if (users instanceof List) {
                    List<?> list = (List<?>) users;
                    if (list.size() == 2 && "java.util.ArrayList".equals(list.get(0)) && list.get(1) instanceof List) {
                        users = list.get(1);
                    }
                }
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/users", users);
            }
        } catch (Exception e) {
            log.error("Failed to parse and broadcast Redis Pub/Sub message: {}", e.getMessage(), e);
        }
    }
}
