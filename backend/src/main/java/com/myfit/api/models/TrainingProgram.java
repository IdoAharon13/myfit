package com.myfit.api.models;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
public class TrainingProgram {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long traineeId;
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String data; // JSON string of the 2D array
    
    private int orderIndex;
}
