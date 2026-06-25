package com.syncboard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "board_workspaces")
public class BoardWorkspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", unique = true, nullable = false)
    private String roomId;

    @Column(name = "drawing_data", columnDefinition = "TEXT")
    private String drawingData; // JSON array of DrawAction objects

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public BoardWorkspace() {
    }

    public BoardWorkspace(String roomId, String drawingData) {
        this.roomId = roomId;
        this.drawingData = drawingData;
    }

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getDrawingData() {
        return drawingData;
    }

    public void setDrawingData(String drawingData) {
        this.drawingData = drawingData;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
