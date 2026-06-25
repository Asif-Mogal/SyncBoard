package com.syncboard.model;

public class CursorPosition {
    private String type; // "CURSOR"
    private String username;
    private Double x;
    private Double y;

    public CursorPosition() {
    }

    public CursorPosition(String type, String username, Double x, Double y) {
        this.type = type;
        this.username = username;
        this.x = x;
        this.y = y;
    }

    // Getters and Setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Double getY() {
        return y;
    }

    public void setY(Double y) {
        this.y = y;
    }

    @Override
    public String toString() {
        return "CursorPosition{" +
                "type='" + type + '\'' +
                ", username='" + username + '\'' +
                ", x=" + x +
                ", y=" + y +
                '}';
    }
}
