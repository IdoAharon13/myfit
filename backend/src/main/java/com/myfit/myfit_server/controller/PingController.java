package com.myfit.myfit_server.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ping")
@CrossOrigin(origins = "*")
public class PingController {

    @GetMapping
    public String ping() {
        return "PONG - MyFit Spring Boot Server is ALIVE!";
    }
}
