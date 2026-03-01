package com.myfit.myfit_server.controller;

import com.myfit.myfit_server.model.History;
import com.myfit.myfit_server.service.JsonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "*")
public class HistoryController {

    @Autowired
    private JsonService jsonService;

    @GetMapping
    public List<History> getAllHistory() throws IOException {
        return jsonService.getHistory();
    }

    @GetMapping("/trainee/{traineeId}")
    public List<History> getHistoryByTrainee(@PathVariable String traineeId) throws IOException {
        return jsonService.getHistoryByTraineeId(traineeId);
    }

    @PostMapping
    public History createHistory(@RequestBody History history) throws IOException {
        return jsonService.saveHistory(history);
    }
}
