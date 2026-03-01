package com.myfit.myfit_server.controller;

import com.myfit.myfit_server.model.Trainee;
import com.myfit.myfit_server.service.JsonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/trainees")
@CrossOrigin(origins = "*")
public class TraineeController {

    @Autowired
    private JsonService jsonService;

    @GetMapping
    public List<Trainee> getAllTrainees() throws IOException {
        return jsonService.getTrainees();
    }

    @PostMapping
    public Trainee createTrainee(@RequestBody Trainee trainee) throws IOException {
        return jsonService.saveTrainee(trainee);
    }

    @DeleteMapping("/{id}")
    public void deleteTrainee(@PathVariable String id) throws IOException {
        jsonService.deleteTrainee(id);
    }
}
