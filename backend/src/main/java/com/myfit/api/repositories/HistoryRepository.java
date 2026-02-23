package com.myfit.api.repositories;

import com.myfit.api.models.HistoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HistoryRepository extends JpaRepository<HistoryEntry, Long> {
    List<HistoryEntry> findByTraineeId(Long traineeId);
}
