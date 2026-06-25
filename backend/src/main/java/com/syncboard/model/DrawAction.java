package com.syncboard.model;

public class DrawAction {
    private String type;        // e.g. "DRAW", "CLEAR", "SHAPE"
    private String username;
    private Double prevX;
    private Double prevY;
    private Double currX;
    private Double currY;
    private String color;
    private Integer lineWidth;
    private String shape;       // "line", "rect", "circle"
    private Boolean fill;       // true if shape is filled
    private String strokeId;    // groups segments of a single continuous stroke

    public DrawAction() {
    }

    public DrawAction(String type, String username, Double prevX, Double prevY, Double currX, Double currY, String color, Integer lineWidth, String shape, Boolean fill, String strokeId) {
        this.type = type;
        this.username = username;
        this.prevX = prevX;
        this.prevY = prevY;
        this.currX = currX;
        this.currY = currY;
        this.color = color;
        this.lineWidth = lineWidth;
        this.shape = shape;
        this.fill = fill;
        this.strokeId = strokeId;
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

    public Double getPrevX() {
        return prevX;
    }

    public void setPrevX(Double prevX) {
        this.prevX = prevX;
    }

    public Double getPrevY() {
        return prevY;
    }

    public void setPrevY(Double prevY) {
        this.prevY = prevY;
    }

    public Double getCurrX() {
        return currX;
    }

    public void setCurrX(Double currX) {
        this.currX = currX;
    }

    public Double getCurrY() {
        return currY;
    }

    public void setCurrY(Double currY) {
        this.currY = currY;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Integer getLineWidth() {
        return lineWidth;
    }

    public void setLineWidth(Integer lineWidth) {
        this.lineWidth = lineWidth;
    }

    public String getShape() {
        return shape;
    }

    public void setShape(String shape) {
        this.shape = shape;
    }

    public Boolean getFill() {
        return fill;
    }

    public void setFill(Boolean fill) {
        this.fill = fill;
    }

    public String getStrokeId() {
        return strokeId;
    }

    public void setStrokeId(String strokeId) {
        this.strokeId = strokeId;
    }

    @Override
    public String toString() {
        return "DrawAction{" +
                "type='" + type + '\'' +
                ", username='" + username + '\'' +
                ", prevX=" + prevX +
                ", prevY=" + prevY +
                ", currX=" + currX +
                ", currY=" + currY +
                ", color='" + color + '\'' +
                ", lineWidth=" + lineWidth +
                ", shape='" + shape + '\'' +
                ", fill=" + fill +
                ", strokeId='" + strokeId + '\'' +
                '}';
    }
}
