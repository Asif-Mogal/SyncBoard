package com.syncboard.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import redis.embedded.RedisServer;

import java.io.IOException;
import java.net.Socket;

@Configuration
public class EmbeddedRedisConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddedRedisConfig.class);

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    private RedisServer redisServer;

    @PostConstruct
    public void startRedis() {
        if (isPortInUse(redisPort)) {
            log.info("Port {} is in use. Assuming Redis (or another instance) is already running.", redisPort);
            return;
        }

        try {
            log.info("Starting embedded Redis server on port {}...", redisPort);
            redisServer = new RedisServer(redisPort);
            redisServer.start();
            log.info("Embedded Redis server started successfully.");
        } catch (Exception e) {
            log.error("Failed to start embedded Redis server: {}", e.getMessage(), e);
        }
    }

    @PreDestroy
    public void stopRedis() {
        if (redisServer != null) {
            log.info("Stopping embedded Redis server...");
            try {
                redisServer.stop();
                log.info("Embedded Redis server stopped.");
            } catch (Exception e) {
                log.error("Error stopping embedded Redis server: {}", e.getMessage(), e);
            }
        }
    }

    private boolean isPortInUse(int port) {
        try (Socket socket = new Socket("localhost", port)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
