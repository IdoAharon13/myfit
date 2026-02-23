package com.myfit.api.models;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
public class HistoryEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long traineeId;
    private String traineeName;
    private String action;
    private String description;
    private String timestamp; // Formatted string as used in frontend or LocalDateTime
}
