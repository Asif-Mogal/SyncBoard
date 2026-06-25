package com.syncboard.controller;

import com.syncboard.model.DrawAction;
import com.syncboard.service.BoardPersistenceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/room")
@CrossOrigin(origins = "*")
public class RoomController {

    private static final Logger log = LoggerFactory.getLogger(RoomController.class);

    private final BoardPersistenceService persistenceService;
    private final Random random = new Random();

    public RoomController(BoardPersistenceService persistenceService) {
        this.persistenceService = persistenceService;
    }

    /**
     * Create a room, generating a unique 6-digit code.
     */
    @PostMapping("/create")
    public ResponseEntity<String> createRoom() {
        String roomId = String.format("%06d", random.nextInt(1000000));
        log.info("Room generated: {}", roomId);
        return ResponseEntity.ok(roomId);
    }

    /**
     * Fetch drawing history for a room.
     */
    @GetMapping("/{roomId}/history")
    public ResponseEntity<List<DrawAction>> getRoomHistory(@PathVariable String roomId) {
        log.info("Fetching stroke history for room: {}", roomId);
        List<DrawAction> history = persistenceService.getCachedActions(roomId);
        return ResponseEntity.ok(history);
    }

    /**
     * Persist the transient whiteboard drawings in Redis to PostgreSQL.
     */
    @PostMapping("/{roomId}/save")
    public ResponseEntity<String> saveRoomWorkspace(@PathVariable String roomId) {
        log.info("Saving workspace for room: {}", roomId);
        persistenceService.persistWorkspaceToDatabase(roomId);
        return ResponseEntity.ok("Workspace persisted successfully");
    }

    /**
     * Fetch active users in the room.
     */
    @GetMapping("/{roomId}/users")
    public ResponseEntity<List<String>> getActiveUsers(@PathVariable String roomId) {
        List<String> users = persistenceService.getActiveUsers(roomId);
        return ResponseEntity.ok(users);
    }
}
