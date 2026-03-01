package com.myfit.myfit_server.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfit.myfit_server.model.History;
import com.myfit.myfit_server.model.Program;
import com.myfit.myfit_server.model.Trainee;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class JsonService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String DATA_DIR = "data";
    private static final String TRAINEES_FILE = DATA_DIR + "/trainees.json";
    private static final String PROGRAMS_FILE = DATA_DIR + "/programs.json";
    private static final String HISTORY_FILE = DATA_DIR + "/history.json";

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(Paths.get(DATA_DIR));
        ensureFileExists(TRAINEES_FILE);
        ensureFileExists(PROGRAMS_FILE);
        ensureFileExists(HISTORY_FILE);
    }

    private void ensureFileExists(String filePath) throws IOException {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            Files.writeString(path, "[]");
        }
    }

    // Trainee Methods
    public List<Trainee> getTrainees() throws IOException {
        return objectMapper.readValue(new File(TRAINEES_FILE), new TypeReference<List<Trainee>>() {
        });
    }

    public Trainee saveTrainee(Trainee trainee) throws IOException {
        List<Trainee> trainees = getTrainees();
        if (trainee.getId() == null || trainee.getId().isEmpty()) {
            trainee.setId(String.valueOf(System.currentTimeMillis()));
        } else {
            trainees.removeIf(t -> t.getId().equals(trainee.getId()));
        }
        trainees.add(trainee);
        objectMapper.writeValue(new File(TRAINEES_FILE), trainees);
        return trainee;
    }

    public void deleteTrainee(String id) throws IOException {
        List<Trainee> trainees = getTrainees();
        trainees.removeIf(t -> t.getId().equals(id));
        objectMapper.writeValue(new File(TRAINEES_FILE), trainees);
    }

    // Program Methods
    public List<Program> getPrograms() throws IOException {
        return objectMapper.readValue(new File(PROGRAMS_FILE), new TypeReference<List<Program>>() {
        });
    }

    public List<Program> getProgramsByTraineeId(String traineeId) throws IOException {
        return getPrograms().stream()
                .filter(p -> p.getTraineeId().equals(traineeId))
                .collect(Collectors.toList());
    }

    public Program saveProgram(Program program) throws IOException {
        List<Program> programs = getPrograms();
        if (program.getId() == null || program.getId().isEmpty()) {
            program.setId(String.valueOf(System.currentTimeMillis()));
        } else {
            programs.removeIf(p -> p.getId().equals(program.getId()));
        }
        programs.add(program);
        objectMapper.writeValue(new File(PROGRAMS_FILE), programs);
        return program;
    }

    public void deleteProgram(String id) throws IOException {
        List<Program> programs = getPrograms();
        programs.removeIf(p -> p.getId().equals(id));
        objectMapper.writeValue(new File(PROGRAMS_FILE), programs);
    }

    // History Methods
    public List<History> getHistory() throws IOException {
        return objectMapper.readValue(new File(HISTORY_FILE), new TypeReference<List<History>>() {
        });
    }

    public List<History> getHistoryByTraineeId(String traineeId) throws IOException {
        return getHistory().stream()
                .filter(h -> h.getTraineeId().equals(traineeId))
                .collect(Collectors.toList());
    }

    public History saveHistory(History history) throws IOException {
        List<History> logs = getHistory();
        if (history.getId() == null || history.getId().isEmpty()) {
            history.setId(String.valueOf(System.currentTimeMillis()));
        } else {
            logs.removeIf(h -> h.getId().equals(history.getId()));
        }
        logs.add(history);
        objectMapper.writeValue(new File(HISTORY_FILE), logs);
        return history;
    }
}
