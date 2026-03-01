package com.myfit.myfit_server.model;

import java.util.List;

public class Program {
    private String id;
    private String traineeId;
    private String name;
    private String description;
    private List<Workout> workouts;

    public static class Workout {
        private String day;
        private List<Exercise> exercises;

        public String getDay() {
            return day;
        }

        public void setDay(String day) {
            this.day = day;
        }

        public List<Exercise> getExercises() {
            return exercises;
        }

        public void setExercises(List<Exercise> exercises) {
            this.exercises = exercises;
        }
    }

    public static class Exercise {
        private String name;
        private String sets;
        private String reps;
        private String rest;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getSets() {
            return sets;
        }

        public void setSets(String sets) {
            this.sets = sets;
        }

        public String getReps() {
            return reps;
        }

        public void setReps(String reps) {
            this.reps = reps;
        }

        public String getRest() {
            return rest;
        }

        public void setRest(String rest) {
            this.rest = rest;
        }
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTraineeId() {
        return traineeId;
    }

    public void setTraineeId(String traineeId) {
        this.traineeId = traineeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Workout> getWorkouts() {
        return workouts;
    }

    public void setWorkouts(List<Workout> workouts) {
        this.workouts = workouts;
    }
}
