package com.syncboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.syncboard.model.BoardWorkspace;
import com.syncboard.model.DrawAction;
import com.syncboard.repository.BoardWorkspaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BoardPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(BoardPersistenceService.class);

    private final BoardWorkspaceRepository repository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String ROOM_ACTIONS_KEY_PREFIX = "room:%s:actions";
    private static final String ROOM_USERS_KEY_PREFIX = "room:%s:users";
    private static final long ROOM_TTL_HOURS = 2;

    public BoardPersistenceService(BoardWorkspaceRepository repository,
                                   RedisTemplate<String, Object> redisTemplate,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private String getActionsKey(String roomId) {
        return String.format(ROOM_ACTIONS_KEY_PREFIX, roomId);
    }

    private String getUsersKey(String roomId) {
        return String.format(ROOM_USERS_KEY_PREFIX, roomId);
    }

    /**
     * Cache a transient draw action in Redis.
     */
    public void cacheAction(String roomId, DrawAction action) {
        try {
            String key = getActionsKey(roomId);
            redisTemplate.opsForList().rightPush(key, action);
            redisTemplate.expire(key, Duration.ofHours(ROOM_TTL_HOURS));
        } catch (Exception e) {
            log.error("Failed to cache draw action in Redis for room {}", roomId, e);
        }
    }

    /**
     * Clear cached actions in Redis (e.g. on clear-board event).
     */
    public void clearCachedActions(String roomId) {
        try {
            String key = getActionsKey(roomId);
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.error("Failed to clear cached actions in Redis for room {}", roomId, e);
        }
    }

    /**
     * Retrieve all cached transient actions from Redis. If Redis is empty, attempt to load from PostgreSQL.
     */
    public List<DrawAction> getCachedActions(String roomId) {
        String key = getActionsKey(roomId);
        try {
            List<Object> cachedList = redisTemplate.opsForList().range(key, 0, -1);
            if (cachedList != null && !cachedList.isEmpty()) {
                redisTemplate.expire(key, Duration.ofHours(ROOM_TTL_HOURS));
                return cachedList.stream()
                        .map(obj -> objectMapper.convertValue(obj, DrawAction.class))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Failed to fetch cached actions from Redis for room {}, falling back to PostgreSQL", roomId, e);
        }

        // Fallback to PostgreSQL
        List<DrawAction> dbActions = getFromDatabase(roomId);
        if (!dbActions.isEmpty()) {
            // Repopulate Redis cache
            try {
                for (DrawAction action : dbActions) {
                    redisTemplate.opsForList().rightPush(key, action);
                }
                redisTemplate.expire(key, Duration.ofHours(ROOM_TTL_HOURS));
            } catch (Exception e) {
                log.error("Failed to repopulate Redis cache for room {}", roomId, e);
            }
        }
        return dbActions;
    }

    /**
     * Persists transient actions currently cached in Redis into PostgreSQL database.
     */
    public void persistWorkspaceToDatabase(String roomId) {
        List<DrawAction> actions = getCachedActions(roomId);
        try {
            String json = objectMapper.writeValueAsString(actions);
            BoardWorkspace workspace = repository.findByRoomId(roomId)
                    .orElse(new BoardWorkspace(roomId, null));
            workspace.setDrawingData(json);
            repository.save(workspace);
            log.info("Persisted room {} workspace to PostgreSQL with {} actions", roomId, actions.size());
        } catch (Exception e) {
            log.error("Failed to persist workspace to PostgreSQL for room {}", roomId, e);
        }
    }

    private List<DrawAction> getFromDatabase(String roomId) {
        Optional<BoardWorkspace> workspace = repository.findByRoomId(roomId);
        if (workspace.isPresent() && workspace.get().getDrawingData() != null) {
            try {
                return objectMapper.readValue(workspace.get().getDrawingData(), new TypeReference<List<DrawAction>>() {});
            } catch (Exception e) {
                log.error("Failed to parse database drawing JSON for room {}", roomId, e);
            }
        }
        return new ArrayList<>();
    }

    /**
     * Add user to the active users set in Redis.
     */
    public void addActiveUser(String roomId, String username) {
        try {
            String key = getUsersKey(roomId);
            redisTemplate.opsForSet().add(key, username);
            redisTemplate.expire(key, Duration.ofHours(ROOM_TTL_HOURS));
        } catch (Exception e) {
            log.error("Failed to add active user {} in Redis for room {}", username, roomId, e);
        }
    }

    /**
     * Remove user from the active users set in Redis.
     */
    public void removeActiveUser(String roomId, String username) {
        try {
            String key = getUsersKey(roomId);
            redisTemplate.opsForSet().remove(key, username);
        } catch (Exception e) {
            log.error("Failed to remove active user {} in Redis for room {}", username, roomId, e);
        }
    }

    /**
     * Get all active users from Redis.
     */
    public List<String> getActiveUsers(String roomId) {
        try {
            String key = getUsersKey(roomId);
            return redisTemplate.opsForSet().members(key).stream()
                    .map(Object::toString)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to get active users from Redis for room {}", roomId, e);
            return new ArrayList<>();
        }
    }

    /**
     * Remove the last drawing action (and all segments sharing the same strokeId) made by a specific user from the Redis cache.
     * Returns the strokeId that was undone.
     */
    public String undoLastAction(String roomId, String username) {
        try {
            String key = getActionsKey(roomId);
            List<Object> cachedList = redisTemplate.opsForList().range(key, 0, -1);
            if (cachedList != null && !cachedList.isEmpty()) {
                List<DrawAction> actions = cachedList.stream()
                        .map(obj -> objectMapper.convertValue(obj, DrawAction.class))
                        .collect(Collectors.toList());

                // Scan backwards to find the last action matching this user
                int lastIndex = -1;
                for (int i = actions.size() - 1; i >= 0; i--) {
                    if (username.equals(actions.get(i).getUsername())) {
                        lastIndex = i;
                        break;
                    }
                }

                if (lastIndex != -1) {
                    DrawAction lastAction = actions.get(lastIndex);
                    String strokeId = lastAction.getStrokeId();

                    if (strokeId != null && !strokeId.isEmpty()) {
                        // Remove all drawing actions associated with this strokeId
                        actions.removeIf(action -> strokeId.equals(action.getStrokeId()));
                    } else {
                        // Fallback for actions missing a strokeId
                        actions.remove(lastIndex);
                    }

                    // Overwrite Redis list with the updated history
                    redisTemplate.delete(key);
                    if (!actions.isEmpty()) {
                        redisTemplate.opsForList().rightPushAll(key, actions.toArray());
                        redisTemplate.expire(key, Duration.ofHours(ROOM_TTL_HOURS));
                    }
                    log.info("Undid stroke '{}' for user '{}' in room '{}'", strokeId, username, roomId);
                    return strokeId;
                }
            }
        } catch (Exception e) {
            log.error("Failed to undo last action for user {} in room {}", username, roomId, e);
        }
        return null;
    }
}
