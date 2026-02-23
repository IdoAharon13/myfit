package com.myfit.api.controllers;

import com.myfit.api.models.Trainee;
import com.myfit.api.repositories.TraineeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trainees")
@CrossOrigin(origins = "*") // For development
public class TraineeController {

    @Autowired
    private TraineeRepository repository;

    @GetMapping
    public List<Trainee> getTrainees() {
        return repository.findAll();
    }

    @PostMapping
    public Trainee setTrainee(@RequestBody Trainee trainee) {
        return repository.save(trainee);
    }

    @DeleteMapping("/{id}")
    public void deleteTrainee(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
