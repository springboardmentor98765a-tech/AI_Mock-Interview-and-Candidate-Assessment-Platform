package com.smarthireai.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candidate")
public class CandidateController {

    @GetMapping("/dashboard")
    public String dashboard() {
        return "Welcome Candidate! JWT Authentication Successful.";
    }
}