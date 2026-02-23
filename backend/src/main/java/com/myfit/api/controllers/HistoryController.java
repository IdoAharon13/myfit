package com.myfit.api.controllers;

import com.myfit.api.models.HistoryEntry;
import com.myfit.api.repositories.HistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "*")
public class HistoryController {

    @Autowired
    private HistoryRepository repository;

    @GetMapping
    public List<HistoryEntry> getAllHistory() {
        return repository.findAll();
    }

    @GetMapping("/trainee/{traineeId}")
    public List<HistoryEntry> getHistory(@PathVariable Long traineeId) {
        return repository.findByTraineeId(traineeId);
    }

    @PostMapping
    public HistoryEntry setHistory(@RequestBody HistoryEntry entry) {
        return repository.save(entry);
    }
}
