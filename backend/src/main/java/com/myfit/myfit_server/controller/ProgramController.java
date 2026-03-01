package com.myfit.myfit_server.controller;

import com.myfit.myfit_server.model.Program;
import com.myfit.myfit_server.service.JsonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/programs")
@CrossOrigin(origins = "*")
public class ProgramController {

    @Autowired
    private JsonService jsonService;

    @GetMapping
    public List<Program> getAllPrograms() throws IOException {
        return jsonService.getPrograms();
    }

    @GetMapping("/trainee/{traineeId}")
    public List<Program> getProgramsByTrainee(@PathVariable String traineeId) throws IOException {
        return jsonService.getProgramsByTraineeId(traineeId);
    }

    @PostMapping
    public Program createProgram(@RequestBody Program program) throws IOException {
        return jsonService.saveProgram(program);
    }

    @DeleteMapping("/{id}")
    public void deleteProgram(@PathVariable String id) throws IOException {
        jsonService.deleteProgram(id);
    }
}
