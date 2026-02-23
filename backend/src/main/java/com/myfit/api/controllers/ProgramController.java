package com.myfit.api.controllers;

import com.myfit.api.models.TrainingProgram;
import com.myfit.api.repositories.ProgramRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/programs")
@CrossOrigin(origins = "*")
public class ProgramController {

    @Autowired
    private ProgramRepository repository;

    @GetMapping("/trainee/{traineeId}")
    public List<TrainingProgram> getPrograms(@PathVariable Long traineeId) {
        return repository.findByTraineeId(traineeId);
    }

    @PostMapping
    public TrainingProgram setProgram(@RequestBody TrainingProgram program) {
        return repository.save(program);
    }

    @DeleteMapping("/{id}")
    public void deleteProgram(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
