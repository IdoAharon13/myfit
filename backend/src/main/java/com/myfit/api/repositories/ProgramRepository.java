package com.myfit.api.repositories;

import com.myfit.api.models.TrainingProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProgramRepository extends JpaRepository<TrainingProgram, Long> {
    List<TrainingProgram> findByTraineeId(Long traineeId);
}
