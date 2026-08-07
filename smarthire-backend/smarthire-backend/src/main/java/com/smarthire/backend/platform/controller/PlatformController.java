package com.smarthire.backend.platform.controller;

import com.smarthire.backend.ai.analytics.AnalyticsPdfService;
import com.smarthire.backend.platform.dto.PlatformDashboardResponse;
import com.smarthire.backend.platform.service.PlatformInsightsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class PlatformController {

    private final PlatformInsightsService platformInsightsService;
    private final AnalyticsPdfService analyticsPdfService;

    public PlatformController(PlatformInsightsService platformInsightsService,
                              AnalyticsPdfService analyticsPdfService) {
        this.platformInsightsService = platformInsightsService;
        this.analyticsPdfService = analyticsPdfService;
    }

    @GetMapping("/api/admin/dashboard")
    public ResponseEntity<PlatformDashboardResponse> getAdminDashboard() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/admin/users")
    public ResponseEntity<PlatformDashboardResponse> getUsers() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/admin/logs")
    public ResponseEntity<PlatformDashboardResponse> getLogs() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/admin/config")
    public ResponseEntity<PlatformDashboardResponse> getConfig() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/analytics/overview")
    public ResponseEntity<PlatformDashboardResponse> getAnalyticsOverview() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/analytics/leaderboard")
    public ResponseEntity<PlatformDashboardResponse> getLeaderboard() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/analytics/trends")
    public ResponseEntity<PlatformDashboardResponse> getTrends() {
        return ResponseEntity.ok(platformInsightsService.buildDashboard());
    }

    @GetMapping("/api/analytics/report/{userId}")
    public ResponseEntity<byte[]> downloadAnalyticsReport(@PathVariable Long userId) {
        try {
            byte[] pdfBytes = analyticsPdfService.generateAnalyticsReport(userId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "analytics-report-" + userId + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
