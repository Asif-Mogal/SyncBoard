package com.syncboard;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication
public class SyncBoardApplication implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(SyncBoardApplication.class);

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    public static void main(String[] args) {
        SpringApplication.run(SyncBoardApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("DIAGNOSTIC: Resolved spring.datasource.url = {}", maskUrl(datasourceUrl));
        log.info("DIAGNOSTIC: System Env SPRING_DATASOURCE_URL = {}", maskUrl(System.getenv("SPRING_DATASOURCE_URL")));
    }

    private String maskUrl(String url) {
        if (url == null) return "null";
        return url.replaceAll(":[^:@/]+@", ":****@");
    }
}

